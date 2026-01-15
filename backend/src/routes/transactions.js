/**
 * Transactions Routes (Updated with Accounting Integration)
 * 
 * All transactions now post to the journal (double-entry)
 * 
 * Endpoints:
 * GET    /api/transactions          - List transactions
 * GET    /api/transactions/stats    - Transaction statistics
 * GET    /api/transactions/:id      - Get single transaction
 * POST   /api/transactions          - Create transaction (with journal posting)
 * PUT    /api/transactions/:id      - Update transaction
 * DELETE /api/transactions/:id      - Delete transaction (voids journal)
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyJWT } from '../middleware/auth.js';
import {
    getAccountMapping,
    resolveAccountIds,
    createJournalEntry,
    voidJournalEntry,
    seedFamilyCoA,
} from '../services/accountingService.js';

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// ============================================
// Helper: Ensure tenant has accounts
// ============================================
async function ensureAccountsExist(tenantId) {
    const accountCount = await prisma.account.count({ where: { tenantId } });
    if (accountCount === 0) {
        console.log(`[Transactions] Auto-seeding CoA for tenant ${tenantId}`);
        await seedFamilyCoA(tenantId);
    }
}

// ============================================
// GET /api/transactions - List all transactions
// ============================================
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { type, startDate, endDate, category, limit = 50 } = req.query;

        const where = {
            tenantId,
            ...(type && { type }),
            ...(category && { category }),
            ...(startDate || endDate
                ? {
                    date: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) }),
                    },
                }
                : {}),
        };

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                journal: {
                    include: {
                        lines: {
                            include: {
                                account: {
                                    select: { id: true, code: true, name: true, type: true },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
            take: parseInt(limit),
        });

        // Format response with account details
        const formattedTransactions = transactions.map((t) => ({
            id: t.id,
            type: t.type,
            amount: Number(t.amount),
            category: t.category,
            description: t.description,
            date: t.date,
            paymentMethod: t.paymentMethod,
            notes: t.notes,
            user: t.user,
            debitAccountId: t.debitAccountId ? `acct-${t.debitAccountId}` : null,
            creditAccountId: t.creditAccountId ? `acct-${t.creditAccountId}` : null,
            journalId: t.journalId,
            journalReference: t.journal?.reference,
            accountingDetails: t.journal?.lines?.map((line) => ({
                account: line.account?.name,
                debit: Number(line.debit),
                credit: Number(line.credit),
            })),
        }));

        res.json(formattedTransactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ============================================
// GET /api/transactions/stats - Statistics
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { startDate, endDate } = req.query;
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const dateFilter = {
            date: {
                gte: startDate ? new Date(startDate) : firstDayOfMonth,
                lte: endDate ? new Date(endDate) : lastDayOfMonth,
            },
        };

        // Get income and expense totals
        const [income, expenses] = await Promise.all([
            prisma.transaction.aggregate({
                where: {
                    tenantId,
                    type: 'INCOME',
                    ...dateFilter,
                },
                _sum: {
                    amount: true,
                },
            }),
            prisma.transaction.aggregate({
                where: {
                    tenantId,
                    type: 'EXPENSE',
                    ...dateFilter,
                },
                _sum: {
                    amount: true,
                },
            }),
        ]);

        // Get category breakdown
        const categoryBreakdown = await prisma.transaction.groupBy({
            by: ['category', 'type'],
            where: {
                tenantId,
                ...dateFilter,
            },
            _sum: {
                amount: true,
            },
            _count: {
                id: true,
            },
        });

        const totalIncome = Number(income._sum.amount || 0);
        const totalExpenses = Number(expenses._sum.amount || 0);
        const net = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

        res.json({
            totalIncome,
            totalExpenses,
            net,
            savingsRate: Math.round(savingsRate * 100) / 100,
            categoryBreakdown: categoryBreakdown.map((c) => ({
                category: c.category,
                type: c.type,
                amount: Number(c._sum.amount),
                count: c._count.id,
            })),
        });
    } catch (error) {
        console.error('Error fetching transaction stats:', error);
        res.status(500).json({ error: 'Failed to fetch transaction statistics' });
    }
});

// ============================================
// POST /api/transactions - Create transaction
// This is the main endpoint that integrates with accounting
// ============================================
router.post('/', async (req, res) => {
    try {
        const { tenantId, id: userId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        // Ensure accounts exist (auto-seed if needed)
        await ensureAccountsExist(tenantId);

        const {
            type,
            amount,
            category,
            description,
            date,
            paymentMethod,
            notes,
            debitAccountId,
            creditAccountId,
            accountId, // Legacy support - used as the asset account
        } = req.body;

        // Validation
        if (!type || !amount || !category) {
            return res.status(400).json({ error: 'Type, amount, and category are required' });
        }

        if (!['INCOME', 'EXPENSE'].includes(type)) {
            return res.status(400).json({ error: 'Type must be INCOME or EXPENSE' });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }

        // Determine debit and credit accounts
        let resolvedDebitAccountId = null;
        let resolvedCreditAccountId = null;

        if (debitAccountId && creditAccountId) {
            // Frontend provided specific accounts
            // Resolve from acct-XXXX format
            const debitCode = debitAccountId.replace('acct-', '');
            const creditCode = creditAccountId.replace('acct-', '');

            const [debitAccount, creditAccount] = await Promise.all([
                prisma.account.findFirst({ where: { tenantId, code: debitCode } }),
                prisma.account.findFirst({ where: { tenantId, code: creditCode } }),
            ]);

            resolvedDebitAccountId = debitAccount?.id;
            resolvedCreditAccountId = creditAccount?.id;
        } else {
            // Use automatic mapping based on category
            const mapping = getAccountMapping(category, type);

            // If accountId (legacy) is provided, use it as the asset account
            let assetAccountCode = null;
            if (accountId) {
                assetAccountCode = accountId.replace('acct-', '');
            }

            // Override default asset account if specified
            if (assetAccountCode) {
                if (type === 'INCOME') {
                    mapping.debitAccountCode = assetAccountCode;
                } else {
                    mapping.creditAccountCode = assetAccountCode;
                }
            }

            // Also check paymentMethod to determine asset account
            if (paymentMethod && !accountId) {
                const paymentMethodToAccount = {
                    'Cash': '1000',
                    'M-Pesa': '1030',
                    'Mpesa': '1030',
                    'Bank Transfer': '1010',
                    'Bank Card': '1010',
                    'Credit Card': '2000',
                };

                const assetCode = paymentMethodToAccount[paymentMethod];
                if (assetCode) {
                    if (type === 'INCOME') {
                        mapping.debitAccountCode = assetCode;
                    } else {
                        mapping.creditAccountCode = assetCode;
                    }
                }
            }

            const accountIds = await resolveAccountIds(
                tenantId,
                mapping.debitAccountCode,
                mapping.creditAccountCode
            );

            resolvedDebitAccountId = accountIds.debitAccountId;
            resolvedCreditAccountId = accountIds.creditAccountId;
        }

        // Validate accounts were resolved
        if (!resolvedDebitAccountId || !resolvedCreditAccountId) {
            console.error('Failed to resolve accounts:', {
                debitAccountId,
                creditAccountId,
                resolvedDebitAccountId,
                resolvedCreditAccountId,
            });
            return res.status(400).json({
                error: 'Unable to determine accounting accounts. Please select accounts manually.',
            });
        }

        // Create journal entry (double-entry posting)
        const journalDescription = `${type}: ${category}${description ? ' - ' + description : ''}`;

        const journal = await createJournalEntry({
            tenantId,
            debitAccountId: resolvedDebitAccountId,
            creditAccountId: resolvedCreditAccountId,
            amount: parsedAmount,
            description: journalDescription,
            date: date ? new Date(date) : new Date(),
            createdById: userId,
        });

        // Create transaction record (user-facing record)
        const transaction = await prisma.transaction.create({
            data: {
                tenantId,
                userId,
                type,
                amount: parsedAmount,
                category,
                description,
                date: date ? new Date(date) : new Date(),
                paymentMethod,
                notes,
                journalId: journal.id,
                debitAccountId: resolvedDebitAccountId,
                creditAccountId: resolvedCreditAccountId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        console.log(`[Transactions] Created transaction ${transaction.id} with journal ${journal.id}`);

        res.status(201).json({
            ...transaction,
            amount: Number(transaction.amount),
            journalReference: journal.reference,
            debitAccountId: `acct-${resolvedDebitAccountId}`,
            creditAccountId: `acct-${resolvedCreditAccountId}`,
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});

// ============================================
// GET /api/transactions/:id - Get single transaction
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const transaction = await prisma.transaction.findFirst({
            where: {
                id: parseInt(id),
                tenantId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                journal: {
                    include: {
                        lines: {
                            include: {
                                account: {
                                    select: { id: true, code: true, name: true, type: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({
            ...transaction,
            amount: Number(transaction.amount),
            journalReference: transaction.journal?.reference,
            accountingDetails: transaction.journal?.lines?.map((line) => ({
                account: line.account?.name,
                code: line.account?.code,
                debit: Number(line.debit),
                credit: Number(line.credit),
            })),
        });
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
});

// ============================================
// PUT /api/transactions/:id - Update transaction
// Note: This creates a reversal and new entry for proper audit trail
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { tenantId, id: userId } = req.user;
        const { id } = req.params;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        // Verify transaction belongs to user's family
        const existing = await prisma.transaction.findFirst({
            where: {
                id: parseInt(id),
                tenantId,
            },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const {
            type,
            amount,
            category,
            description,
            date,
            paymentMethod,
            notes,
        } = req.body;

        // For simple updates (no amount/account changes), just update the record
        const hasAccountingChange =
            (amount !== undefined && parseFloat(amount) !== Number(existing.amount)) ||
            (type !== undefined && type !== existing.type) ||
            (category !== undefined && category !== existing.category);

        if (hasAccountingChange && existing.journalId) {
            // Void the original journal entry
            await voidJournalEntry(existing.journalId);

            // Create new journal entry with updated values
            const newAmount = amount !== undefined ? parseFloat(amount) : Number(existing.amount);
            const newType = type || existing.type;
            const newCategory = category || existing.category;

            const mapping = getAccountMapping(newCategory, newType);
            const accountIds = await resolveAccountIds(
                tenantId,
                mapping.debitAccountCode,
                mapping.creditAccountCode
            );

            const journal = await createJournalEntry({
                tenantId,
                debitAccountId: accountIds.debitAccountId,
                creditAccountId: accountIds.creditAccountId,
                amount: newAmount,
                description: `${newType}: ${newCategory}${description ? ' - ' + description : ''}`,
                date: date ? new Date(date) : existing.date,
                createdById: userId,
            });

            // Update transaction with new journal
            const transaction = await prisma.transaction.update({
                where: { id: parseInt(id) },
                data: {
                    ...(type && { type }),
                    ...(amount !== undefined && { amount: parseFloat(amount) }),
                    ...(category && { category }),
                    ...(description !== undefined && { description }),
                    ...(date && { date: new Date(date) }),
                    ...(paymentMethod !== undefined && { paymentMethod }),
                    ...(notes !== undefined && { notes }),
                    journalId: journal.id,
                    debitAccountId: accountIds.debitAccountId,
                    creditAccountId: accountIds.creditAccountId,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                },
            });

            return res.json({
                ...transaction,
                amount: Number(transaction.amount),
                journalReference: journal.reference,
            });
        }

        // Simple update (no accounting changes)
        const transaction = await prisma.transaction.update({
            where: { id: parseInt(id) },
            data: {
                ...(type && { type }),
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(category && { category }),
                ...(description !== undefined && { description }),
                ...(date && { date: new Date(date) }),
                ...(paymentMethod !== undefined && { paymentMethod }),
                ...(notes !== undefined && { notes }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        res.json({
            ...transaction,
            amount: Number(transaction.amount),
        });
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
});

// ============================================
// DELETE /api/transactions/:id - Delete transaction
// Voids the journal entry and removes the transaction
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        // Verify transaction belongs to user's family
        const existing = await prisma.transaction.findFirst({
            where: {
                id: parseInt(id),
                tenantId,
            },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Void the journal entry if it exists
        if (existing.journalId) {
            try {
                await voidJournalEntry(existing.journalId);
            } catch (journalError) {
                console.warn('Could not void journal:', journalError.message);
                // Continue with deletion even if journal void fails
            }
        }

        // Delete the transaction
        await prisma.transaction.delete({
            where: { id: parseInt(id) },
        });

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});

export default router;
