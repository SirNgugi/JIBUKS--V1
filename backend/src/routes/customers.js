import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Apply JWT verification to all routes
router.use(verifyJWT);

// ============================================
// GET ALL CUSTOMERS
// ============================================
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { active } = req.query;

        const where = { tenantId };
        if (active !== undefined) {
            where.isActive = active === 'true';
        }

        const customers = await prisma.customer.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                invoices: {
                    select: {
                        id: true,
                        total: true,
                        amountPaid: true,
                        status: true,
                    },
                },
            },
        });

        // Calculate customer balances
        const customersWithBalance = customers.map(customer => ({
            ...customer,
            balance: customer.invoices.reduce((sum, inv) =>
                sum + (Number(inv.total) - Number(inv.amountPaid)), 0
            ),
            totalInvoices: customer.invoices.length,
        }));

        res.json(customersWithBalance);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// ============================================
// GET SINGLE CUSTOMER WITH INVOICE HISTORY
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const customerId = parseInt(req.params.id);

        const customer = await prisma.customer.findFirst({
            where: { id: customerId, tenantId },
            include: {
                invoices: {
                    orderBy: { invoiceDate: 'desc' },
                    include: {
                        items: true,
                        payments: true,
                    },
                },
            },
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Calculate balance
        const balance = customer.invoices.reduce((sum, inv) =>
            sum + (Number(inv.total) - Number(inv.amountPaid)), 0
        );

        res.json({ ...customer, balance });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});

// ============================================
// CREATE NEW CUSTOMER
// ============================================
router.post('/', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const {
            name,
            email,
            phone,
            address,
            city,
            state,
            zipCode,
            country,
            paymentTerms,
            creditLimit,
            taxNumber,
            notes,
        } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({ error: 'Customer name is required' });
        }

        const customer = await prisma.customer.create({
            data: {
                tenantId,
                name,
                email,
                phone,
                address,
                city,
                state,
                zipCode,
                country: country || 'Kenya',
                paymentTerms: paymentTerms || 'Net 30',
                creditLimit: creditLimit ? parseFloat(creditLimit) : null,
                taxNumber,
                notes,
                balance: 0,
                isActive: true,
            },
        });

        res.status(201).json(customer);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

// ============================================
// UPDATE CUSTOMER
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const customerId = parseInt(req.params.id);
        const {
            name,
            email,
            phone,
            address,
            city,
            state,
            zipCode,
            country,
            paymentTerms,
            creditLimit,
            taxNumber,
            notes,
            isActive,
        } = req.body;

        const customer = await prisma.customer.findFirst({
            where: { id: customerId, tenantId },
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const updated = await prisma.customer.update({
            where: { id: customerId },
            data: {
                name,
                email,
                phone,
                address,
                city,
                state,
                zipCode,
                country,
                paymentTerms,
                creditLimit: creditLimit ? parseFloat(creditLimit) : null,
                taxNumber,
                notes,
                isActive,
            },
        });

        res.json(updated);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

// ============================================
// DELETE CUSTOMER
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const customerId = parseInt(req.params.id);

        const customer = await prisma.customer.findFirst({
            where: { id: customerId, tenantId },
            include: { invoices: true },
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Don't allow deletion if customer has invoices
        if (customer.invoices.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete customer with existing invoices. Deactivate instead.',
            });
        }

        await prisma.customer.delete({
            where: { id: customerId },
        });

        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

// ============================================
// GET CUSTOMER STATEMENT
// ============================================
router.get('/:id/statement', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const customerId = parseInt(req.params.id);
        const { startDate, endDate } = req.query;

        const customer = await prisma.customer.findFirst({
            where: { id: customerId, tenantId },
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const where = {
            customerId,
            tenantId,
        };

        if (startDate && endDate) {
            where.invoiceDate = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const invoices = await prisma.invoice.findMany({
            where,
            orderBy: { invoiceDate: 'asc' },
            include: {
                payments: {
                    orderBy: { paymentDate: 'asc' },
                },
            },
        });

        // Build statement with running balance
        let runningBalance = 0;
        const transactions = [];

        for (const invoice of invoices) {
            // Add invoice
            runningBalance += Number(invoice.total);
            transactions.push({
                date: invoice.invoiceDate,
                type: 'Invoice',
                reference: invoice.invoiceNumber,
                debit: Number(invoice.total),
                credit: 0,
                balance: runningBalance,
            });

            // Add payments
            for (const payment of invoice.payments) {
                runningBalance -= Number(payment.amount);
                transactions.push({
                    date: payment.paymentDate,
                    type: 'Payment',
                    reference: payment.paymentMethod,
                    debit: 0,
                    credit: Number(payment.amount),
                    balance: runningBalance,
                });
            }
        }

        res.json({
            customer,
            transactions,
            currentBalance: runningBalance,
        });
    } catch (error) {
        console.error('Error generating customer statement:', error);
        res.status(500).json({ error: 'Failed to generate statement' });
    }
});

export default router;
