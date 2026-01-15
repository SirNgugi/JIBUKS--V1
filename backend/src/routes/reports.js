/**
 * Financial Reports Routes
 * Generate accounting reports for the family
 * 
 * Endpoints:
 * GET /api/reports/trial-balance   - Trial Balance report
 * GET /api/reports/profit-loss     - Profit & Loss (Income Statement)
 * GET /api/reports/cash-flow       - Cash Flow Statement
 * GET /api/reports/balance-sheet   - Balance Sheet
 * GET /api/reports/summary         - Combined summary report
 */

import express from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyJWT } from '../middleware/auth.js';
import {
    getTrialBalance,
    getProfitAndLoss,
    getCashFlow,
    getBalanceSheet,
    getAllAccountBalances,
} from '../services/accountingService.js';

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// ============================================
// Helper: Parse date range from query params
// ============================================
function parseDateRange(query) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
        startDate: query.startDate ? new Date(query.startDate) : firstDayOfMonth,
        endDate: query.endDate ? new Date(query.endDate) : lastDayOfMonth,
        asOfDate: query.asOfDate ? new Date(query.asOfDate) : new Date(),
    };
}

// ============================================
// GET /api/reports/trial-balance
// ============================================
router.get('/trial-balance', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { asOfDate } = parseDateRange(req.query);

        const trialBalance = await getTrialBalance(tenantId, asOfDate);

        res.json({
            report: 'Trial Balance',
            ...trialBalance,
            generatedAt: new Date(),
        });
    } catch (error) {
        console.error('Error generating trial balance:', error);
        res.status(500).json({ error: 'Failed to generate trial balance' });
    }
});

// ============================================
// GET /api/reports/profit-loss
// ============================================
router.get('/profit-loss', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { startDate, endDate } = parseDateRange(req.query);

        const profitLoss = await getProfitAndLoss(tenantId, startDate, endDate);

        res.json({
            report: 'Profit & Loss Statement',
            ...profitLoss,
            generatedAt: new Date(),
        });
    } catch (error) {
        console.error('Error generating P&L:', error);
        res.status(500).json({ error: 'Failed to generate profit & loss statement' });
    }
});

// ============================================
// GET /api/reports/cash-flow
// ============================================
router.get('/cash-flow', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { startDate, endDate } = parseDateRange(req.query);

        const cashFlow = await getCashFlow(tenantId, startDate, endDate);

        res.json({
            report: 'Cash Flow Statement',
            ...cashFlow,
            generatedAt: new Date(),
        });
    } catch (error) {
        console.error('Error generating cash flow:', error);
        res.status(500).json({ error: 'Failed to generate cash flow statement' });
    }
});

// ============================================
// GET /api/reports/balance-sheet
// ============================================
router.get('/balance-sheet', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { asOfDate } = parseDateRange(req.query);

        const balanceSheet = await getBalanceSheet(tenantId, asOfDate);

        res.json({
            report: 'Balance Sheet',
            ...balanceSheet,
            generatedAt: new Date(),
        });
    } catch (error) {
        console.error('Error generating balance sheet:', error);
        res.status(500).json({ error: 'Failed to generate balance sheet' });
    }
});

// ============================================
// GET /api/reports/summary
// Combined financial summary
// ============================================
router.get('/summary', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { startDate, endDate, asOfDate } = parseDateRange(req.query);

        // Generate all reports in parallel
        const [profitLoss, balanceSheet, cashFlow, accountBalances] = await Promise.all([
            getProfitAndLoss(tenantId, startDate, endDate),
            getBalanceSheet(tenantId, asOfDate),
            getCashFlow(tenantId, startDate, endDate),
            getAllAccountBalances(tenantId),
        ]);

        // Calculate key metrics
        const cashAccounts = accountBalances.filter(a =>
            a.type === 'ASSET' && ['1000', '1010', '1020', '1030'].includes(a.code)
        );
        const totalCash = cashAccounts.reduce((sum, a) => sum + a.balance, 0);

        res.json({
            report: 'Financial Summary',
            period: { startDate, endDate },
            keyMetrics: {
                totalIncome: profitLoss.income.total,
                totalExpenses: profitLoss.expenses.total,
                netIncome: profitLoss.netIncome,
                savingsRate: profitLoss.savingsRate,
                totalAssets: balanceSheet.assets.total,
                totalLiabilities: balanceSheet.liabilities.total,
                netWorth: balanceSheet.assets.total - balanceSheet.liabilities.total,
                totalCash,
                cashFlowNet: cashFlow.totals.netChange,
            },
            topExpenses: profitLoss.expenses.lines
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5),
            topIncome: profitLoss.income.lines
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5),
            cashPositions: cashAccounts.map(a => ({
                name: a.name,
                balance: a.balance,
            })),
            generatedAt: new Date(),
        });
    } catch (error) {
        console.error('Error generating summary report:', error);
        res.status(500).json({ error: 'Failed to generate summary report' });
    }
});

// ============================================
// GET /api/reports/monthly-trend
// Monthly income/expense trend
// ============================================
router.get('/monthly-trend', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { months = 6 } = req.query;
        const monthCount = parseInt(months);

        const trends = [];
        const now = new Date();

        for (let i = monthCount - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

            const [income, expenses] = await Promise.all([
                prisma.journalLine.aggregate({
                    where: {
                        account: { tenantId, type: 'ASSET' },
                        journal: {
                            status: 'POSTED',
                            date: { gte: monthStart, lte: monthEnd },
                        },
                    },
                    _sum: { debit: true },
                }),
                prisma.journalLine.aggregate({
                    where: {
                        account: { tenantId, type: 'EXPENSE' },
                        journal: {
                            status: 'POSTED',
                            date: { gte: monthStart, lte: monthEnd },
                        },
                    },
                    _sum: { debit: true },
                }),
            ]);

            trends.push({
                month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
                monthStart,
                monthEnd,
                income: Number(income._sum.debit || 0),
                expenses: Number(expenses._sum.debit || 0),
                net: Number(income._sum.debit || 0) - Number(expenses._sum.debit || 0),
            });
        }

        res.json({
            report: 'Monthly Trend',
            months: monthCount,
            trends,
            generatedAt: new Date(),
        });
    } catch (error) {
        console.error('Error generating monthly trend:', error);
        res.status(500).json({ error: 'Failed to generate monthly trend' });
    }
});

// ============================================
// GET /api/reports/category-analysis
// Expense breakdown by category
// ============================================
router.get('/category-analysis', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { startDate, endDate } = parseDateRange(req.query);

        // Get expense accounts
        const expenseAccounts = await prisma.account.findMany({
            where: { tenantId, type: 'EXPENSE', isActive: true },
            orderBy: { code: 'asc' },
        });

        const categoryData = await Promise.all(
            expenseAccounts.map(async (account) => {
                const totals = await prisma.journalLine.aggregate({
                    where: {
                        accountId: account.id,
                        journal: {
                            status: 'POSTED',
                            date: { gte: startDate, lte: endDate },
                        },
                    },
                    _sum: { debit: true },
                    _count: { id: true },
                });

                return {
                    category: account.name,
                    code: account.code,
                    amount: Number(totals._sum.debit || 0),
                    transactionCount: totals._count.id || 0,
                };
            })
        );

        // Filter out zeros and calculate percentages
        const activeCategories = categoryData.filter(c => c.amount > 0);
        const totalExpenses = activeCategories.reduce((sum, c) => sum + c.amount, 0);

        const categoriesWithPercentage = activeCategories
            .map(c => ({
                ...c,
                percentage: totalExpenses > 0 ? ((c.amount / totalExpenses) * 100).toFixed(1) : 0,
            }))
            .sort((a, b) => b.amount - a.amount);

        res.json({
            report: 'Category Analysis',
            period: { startDate, endDate },
            categories: categoriesWithPercentage,
            totalExpenses,
            categoryCount: categoriesWithPercentage.length,
            generatedAt: new Date(),
        });
    } catch (error) {
        console.error('Error generating category analysis:', error);
        res.status(500).json({ error: 'Failed to generate category analysis' });
    }
});

export default router;
