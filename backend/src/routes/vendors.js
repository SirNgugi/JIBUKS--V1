import express from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// ============================================
// VENDOR MANAGEMENT ROUTES
// ============================================

/**
 * GET /api/vendors
 * Get all vendors for the tenant
 */
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { active } = req.query;

        const vendors = await prisma.vendor.findMany({
            where: {
                tenantId,
                ...(active !== undefined && { isActive: active === 'true' })
            },
            include: {
                _count: {
                    select: { purchases: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json(vendors);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
});

/**
 * GET /api/vendors/:id
 * Get vendor details with purchase history
 */
router.get('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const vendor = await prisma.vendor.findFirst({
            where: {
                id: parseInt(id),
                tenantId
            },
            include: {
                purchases: {
                    orderBy: { purchaseDate: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        billNumber: true,
                        purchaseDate: true,
                        total: true,
                        amountPaid: true,
                        status: true
                    }
                }
            }
        });

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json({
            ...vendor,
            balance: Number(vendor.balance),
            purchases: vendor.purchases.map(p => ({
                ...p,
                total: Number(p.total),
                amountPaid: Number(p.amountPaid),
                balance: Number(p.total) - Number(p.amountPaid)
            }))
        });
    } catch (error) {
        console.error('Error fetching vendor:', error);
        res.status(500).json({ error: 'Failed to fetch vendor' });
    }
});

/**
 * POST /api/vendors
 * Create a new vendor
 */
router.post('/', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { name, email, phone, address, taxId, paymentTerms } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Vendor name is required' });
        }

        const vendor = await prisma.vendor.create({
            data: {
                tenantId,
                name,
                email,
                phone,
                address,
                taxId,
                paymentTerms: paymentTerms || 'Due on Receipt'
            }
        });

        res.status(201).json({
            ...vendor,
            balance: Number(vendor.balance)
        });
    } catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).json({ error: 'Failed to create vendor' });
    }
});

/**
 * PUT /api/vendors/:id
 * Update vendor details
 */
router.put('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { name, email, phone, address, taxId, paymentTerms, isActive } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        // Verify vendor belongs to tenant
        const existing = await prisma.vendor.findFirst({
            where: { id: parseInt(id), tenantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        const vendor = await prisma.vendor.update({
            where: { id: parseInt(id) },
            data: {
                ...(name && { name }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address }),
                ...(taxId !== undefined && { taxId }),
                ...(paymentTerms !== undefined && { paymentTerms }),
                ...(isActive !== undefined && { isActive })
            }
        });

        res.json({
            ...vendor,
            balance: Number(vendor.balance)
        });
    } catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).json({ error: 'Failed to update vendor' });
    }
});

/**
 * DELETE /api/vendors/:id
 * Delete a vendor (only if no purchases)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        // Check if vendor has purchases
        const vendor = await prisma.vendor.findFirst({
            where: { id: parseInt(id), tenantId },
            include: { _count: { select: { purchases: true } } }
        });

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        if (vendor._count.purchases > 0) {
            return res.status(400).json({
                error: 'Cannot delete vendor with existing purchases. Consider deactivating instead.'
            });
        }

        await prisma.vendor.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Vendor deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({ error: 'Failed to delete vendor' });
    }
});

/**
 * GET /api/vendors/:id/statement
 * Get vendor statement (purchase history and payments)
 */
router.get('/:id/statement', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const vendor = await prisma.vendor.findFirst({
            where: { id: parseInt(id), tenantId }
        });

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        // Build date filter
        const dateFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        const purchases = await prisma.purchase.findMany({
            where: {
                vendorId: parseInt(id),
                tenantId,
                ...(Object.keys(dateFilter).length > 0 && { purchaseDate: dateFilter })
            },
            include: {
                payments: {
                    orderBy: { paymentDate: 'asc' }
                }
            },
            orderBy: { purchaseDate: 'asc' }
        });

        // Calculate running balance
        let runningBalance = 0;
        const transactions = [];

        purchases.forEach(purchase => {
            // Add purchase
            runningBalance += Number(purchase.total);
            transactions.push({
                date: purchase.purchaseDate,
                type: 'PURCHASE',
                reference: purchase.billNumber || `Purchase #${purchase.id}`,
                debit: Number(purchase.total),
                credit: 0,
                balance: runningBalance
            });

            // Add payments
            purchase.payments.forEach(payment => {
                runningBalance -= Number(payment.amount);
                transactions.push({
                    date: payment.paymentDate,
                    type: 'PAYMENT',
                    reference: payment.reference || `Payment #${payment.id}`,
                    debit: 0,
                    credit: Number(payment.amount),
                    balance: runningBalance
                });
            });
        });

        res.json({
            vendor: {
                id: vendor.id,
                name: vendor.name,
                email: vendor.email,
                phone: vendor.phone,
                currentBalance: Number(vendor.balance)
            },
            transactions,
            summary: {
                totalPurchases: purchases.reduce((sum, p) => sum + Number(p.total), 0),
                totalPayments: purchases.reduce((sum, p) =>
                    sum + p.payments.reduce((pSum, pay) => pSum + Number(pay.amount), 0), 0
                ),
                outstandingBalance: Number(vendor.balance)
            }
        });
    } catch (error) {
        console.error('Error generating vendor statement:', error);
        res.status(500).json({ error: 'Failed to generate vendor statement' });
    }
});

export default router;
