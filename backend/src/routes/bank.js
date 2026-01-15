import express from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// ============================================
// BANK TRANSACTION ROUTES
// ============================================

/**
 * GET /api/bank/transactions
 * Get all bank transactions
 */
router.get('/transactions', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { bankAccountId, type, status, reconciled, startDate, endDate } = req.query;

        const transactions = await prisma.bankTransaction.findMany({
            where: {
                tenantId,
                ...(bankAccountId && { bankAccountId: parseInt(bankAccountId) }),
                ...(type && { type }),
                ...(status && { status }),
                ...(reconciled !== undefined && { reconciled: reconciled === 'true' }),
                ...(startDate && endDate && {
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                })
            },
            include: {
                journal: {
                    include: {
                        lines: {
                            include: {
                                account: {
                                    select: {
                                        id: true,
                                        code: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        res.json(transactions.map(t => ({
            ...t,
            amount: Number(t.amount)
        })));
    } catch (error) {
        console.error('Error fetching bank transactions:', error);
        res.status(500).json({ error: 'Failed to fetch bank transactions' });
    }
});

/**
 * POST /api/bank/deposit
 * Record a bank deposit with double-entry accounting
 */
router.post('/deposit', async (req, res) => {
    try {
        const { tenantId, id: userId } = req.user;
        const {
            bankAccountId,
            amount,
            date,
            reference,
            description,
            sourceAccountId, // Where the money came from (Cash, Income, etc.)
            notes
        } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        if (!bankAccountId || !amount || !sourceAccountId) {
            return res.status(400).json({
                error: 'Bank account, amount, and source account are required'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        // Create deposit with journal entry
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Journal Entry
            const journal = await tx.journal.create({
                data: {
                    tenantId,
                    reference: reference || 'Bank Deposit',
                    date: date ? new Date(date) : new Date(),
                    description: description || 'Bank deposit',
                    status: 'POSTED',
                    createdById: userId
                }
            });

            // 2. Create Bank Transaction
            const bankTx = await tx.bankTransaction.create({
                data: {
                    tenantId,
                    bankAccountId: parseInt(bankAccountId),
                    type: 'DEPOSIT',
                    amount,
                    date: date ? new Date(date) : new Date(),
                    reference,
                    description: description || 'Bank deposit',
                    status: 'CLEARED',
                    journalId: journal.id,
                    createdById: userId
                }
            });

            // 3. Create Journal Lines (Double-Entry)
            // Debit: Bank Account (increase)
            await tx.journalLine.create({
                data: {
                    journalId: journal.id,
                    accountId: parseInt(bankAccountId),
                    debit: amount,
                    credit: 0,
                    description: description || 'Bank deposit'
                }
            });

            // Credit: Source Account (decrease)
            await tx.journalLine.create({
                data: {
                    journalId: journal.id,
                    accountId: parseInt(sourceAccountId),
                    debit: 0,
                    credit: amount,
                    description: description || 'Bank deposit'
                }
            });

            return bankTx;
        });

        res.status(201).json({
            ...result,
            amount: Number(result.amount)
        });
    } catch (error) {
        console.error('Error creating deposit:', error);
        res.status(500).json({ error: error.message || 'Failed to create deposit' });
    }
});

/**
 * POST /api/bank/cheque
 * Write a cheque with double-entry accounting
 */
router.post('/cheque', async (req, res) => {
    try {
        const { tenantId, id: userId } = req.user;
        const {
            bankAccountId,
            amount,
            date,
            chequeNumber,
            payee,
            description,
            expenseAccountId, // What the cheque is for
            notes
        } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        if (!bankAccountId || !amount || !chequeNumber || !payee || !expenseAccountId) {
            return res.status(400).json({
                error: 'Bank account, amount, cheque number, payee, and expense account are required'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        // Check if cheque number already exists
        const existing = await prisma.bankTransaction.findFirst({
            where: {
                tenantId,
                bankAccountId: parseInt(bankAccountId),
                chequeNumber,
                type: 'CHEQUE'
            }
        });

        if (existing) {
            return res.status(400).json({
                error: `Cheque number ${chequeNumber} already exists for this account`
            });
        }

        // Create cheque with journal entry
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Journal Entry
            const journal = await tx.journal.create({
                data: {
                    tenantId,
                    reference: `Cheque #${chequeNumber}`,
                    date: date ? new Date(date) : new Date(),
                    description: `Cheque payment to ${payee}${description ? ` - ${description}` : ''}`,
                    status: 'POSTED',
                    createdById: userId
                }
            });

            // 2. Create Bank Transaction
            const bankTx = await tx.bankTransaction.create({
                data: {
                    tenantId,
                    bankAccountId: parseInt(bankAccountId),
                    type: 'CHEQUE',
                    amount,
                    date: date ? new Date(date) : new Date(),
                    chequeNumber,
                    payee,
                    description: description || `Payment to ${payee}`,
                    status: 'PENDING', // Cheques start as pending until cleared
                    journalId: journal.id,
                    createdById: userId
                }
            });

            // 3. Create Journal Lines (Double-Entry)
            // Debit: Expense Account (increase expense)
            await tx.journalLine.create({
                data: {
                    journalId: journal.id,
                    accountId: parseInt(expenseAccountId),
                    debit: amount,
                    credit: 0,
                    description: `Cheque #${chequeNumber} to ${payee}`
                }
            });

            // Credit: Bank Account (decrease)
            await tx.journalLine.create({
                data: {
                    journalId: journal.id,
                    accountId: parseInt(bankAccountId),
                    debit: 0,
                    credit: amount,
                    description: `Cheque #${chequeNumber} to ${payee}`
                }
            });

            return bankTx;
        });

        res.status(201).json({
            ...result,
            amount: Number(result.amount)
        });
    } catch (error) {
        console.error('Error writing cheque:', error);
        res.status(500).json({ error: error.message || 'Failed to write cheque' });
    }
});

/**
 * POST /api/bank/transfer
 * Transfer money between bank accounts
 */
router.post('/transfer', async (req, res) => {
    try {
        const { tenantId, id: userId } = req.user;
        const {
            fromAccountId,
            toAccountId,
            amount,
            date,
            reference,
            description
        } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        if (!fromAccountId || !toAccountId || !amount) {
            return res.status(400).json({
                error: 'From account, to account, and amount are required'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        if (fromAccountId === toAccountId) {
            return res.status(400).json({
                error: 'Cannot transfer to the same account'
            });
        }

        // Create transfer with journal entry
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Journal Entry
            const journal = await tx.journal.create({
                data: {
                    tenantId,
                    reference: reference || 'Bank Transfer',
                    date: date ? new Date(date) : new Date(),
                    description: description || 'Bank transfer',
                    status: 'POSTED',
                    createdById: userId
                }
            });

            // 2. Create Withdrawal Transaction (from account)
            const withdrawal = await tx.bankTransaction.create({
                data: {
                    tenantId,
                    bankAccountId: parseInt(fromAccountId),
                    type: 'TRANSFER',
                    amount,
                    date: date ? new Date(date) : new Date(),
                    reference,
                    description: `Transfer to account`,
                    status: 'CLEARED',
                    journalId: journal.id,
                    createdById: userId
                }
            });

            // 3. Create Deposit Transaction (to account)
            const deposit = await tx.bankTransaction.create({
                data: {
                    tenantId,
                    bankAccountId: parseInt(toAccountId),
                    type: 'TRANSFER',
                    amount,
                    date: date ? new Date(date) : new Date(),
                    reference,
                    description: `Transfer from account`,
                    status: 'CLEARED',
                    journalId: journal.id,
                    createdById: userId
                }
            });

            // 4. Create Journal Lines (Double-Entry)
            // Debit: To Account (increase)
            await tx.journalLine.create({
                data: {
                    journalId: journal.id,
                    accountId: parseInt(toAccountId),
                    debit: amount,
                    credit: 0,
                    description: 'Bank transfer - received'
                }
            });

            // Credit: From Account (decrease)
            await tx.journalLine.create({
                data: {
                    journalId: journal.id,
                    accountId: parseInt(fromAccountId),
                    debit: 0,
                    credit: amount,
                    description: 'Bank transfer - sent'
                }
            });

            return { withdrawal, deposit, journal };
        });

        res.status(201).json({
            message: 'Transfer completed successfully',
            withdrawal: {
                ...result.withdrawal,
                amount: Number(result.withdrawal.amount)
            },
            deposit: {
                ...result.deposit,
                amount: Number(result.deposit.amount)
            }
        });
    } catch (error) {
        console.error('Error creating transfer:', error);
        res.status(500).json({ error: error.message || 'Failed to create transfer' });
    }
});

/**
 * PUT /api/bank/reconcile/:id
 * Mark transaction as reconciled
 */
router.put('/reconcile/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { reconciled = true } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const existing = await prisma.bankTransaction.findFirst({
            where: { id: parseInt(id), tenantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = await prisma.bankTransaction.update({
            where: { id: parseInt(id) },
            data: {
                reconciled,
                reconciledDate: reconciled ? new Date() : null
            }
        });

        res.json({
            ...transaction,
            amount: Number(transaction.amount)
        });
    } catch (error) {
        console.error('Error reconciling transaction:', error);
        res.status(500).json({ error: 'Failed to reconcile transaction' });
    }
});

/**
 * PUT /api/bank/status/:id
 * Update transaction status (for cheques: PENDING -> CLEARED/BOUNCED)
 */
router.put('/status/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { status } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        if (!['PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status. Must be PENDING, CLEARED, BOUNCED, or CANCELLED'
            });
        }

        const existing = await prisma.bankTransaction.findFirst({
            where: { id: parseInt(id), tenantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = await prisma.bankTransaction.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        res.json({
            ...transaction,
            amount: Number(transaction.amount)
        });
    } catch (error) {
        console.error('Error updating transaction status:', error);
        res.status(500).json({ error: 'Failed to update transaction status' });
    }
});

/**
 * GET /api/bank/unreconciled
 * Get unreconciled transactions
 */
router.get('/unreconciled', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { bankAccountId } = req.query;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const transactions = await prisma.bankTransaction.findMany({
            where: {
                tenantId,
                reconciled: false,
                status: 'CLEARED',
                ...(bankAccountId && { bankAccountId: parseInt(bankAccountId) })
            },
            orderBy: { date: 'asc' }
        });

        const summary = {
            count: transactions.length,
            totalDebits: transactions
                .filter(t => ['WITHDRAWAL', 'CHEQUE'].includes(t.type))
                .reduce((sum, t) => sum + Number(t.amount), 0),
            totalCredits: transactions
                .filter(t => ['DEPOSIT', 'TRANSFER'].includes(t.type))
                .reduce((sum, t) => sum + Number(t.amount), 0)
        };

        res.json({
            summary,
            transactions: transactions.map(t => ({
                ...t,
                amount: Number(t.amount)
            }))
        });
    } catch (error) {
        console.error('Error fetching unreconciled transactions:', error);
        res.status(500).json({ error: 'Failed to fetch unreconciled transactions' });
    }
});

/**
 * GET /api/bank/statement
 * Get bank statement for a period
 */
router.get('/statement', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { bankAccountId, startDate, endDate } = req.query;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        if (!bankAccountId || !startDate || !endDate) {
            return res.status(400).json({
                error: 'Bank account, start date, and end date are required'
            });
        }

        const transactions = await prisma.bankTransaction.findMany({
            where: {
                tenantId,
                bankAccountId: parseInt(bankAccountId),
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            },
            orderBy: { date: 'asc' }
        });

        // Calculate running balance
        let runningBalance = 0;
        const statement = transactions.map(tx => {
            if (['DEPOSIT', 'TRANSFER'].includes(tx.type) && tx.bankAccountId === parseInt(bankAccountId)) {
                runningBalance += Number(tx.amount);
            } else {
                runningBalance -= Number(tx.amount);
            }

            return {
                ...tx,
                amount: Number(tx.amount),
                balance: runningBalance
            };
        });

        const summary = {
            openingBalance: 0, // Would need to calculate from previous transactions
            deposits: transactions
                .filter(t => t.type === 'DEPOSIT')
                .reduce((sum, t) => sum + Number(t.amount), 0),
            withdrawals: transactions
                .filter(t => ['WITHDRAWAL', 'CHEQUE'].includes(t.type))
                .reduce((sum, t) => sum + Number(t.amount), 0),
            closingBalance: runningBalance
        };

        res.json({
            summary,
            transactions: statement
        });
    } catch (error) {
        console.error('Error generating bank statement:', error);
        res.status(500).json({ error: 'Failed to generate bank statement' });
    }
});

export default router;
