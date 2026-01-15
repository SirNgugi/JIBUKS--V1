import express from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// ============================================
// INVENTORY/STOCK MANAGEMENT ROUTES
// ============================================

/**
 * GET /api/inventory
 * Get all inventory items
 */
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const { active, lowStock } = req.query;

        const items = await prisma.inventoryItem.findMany({
            where: {
                tenantId,
                ...(active !== undefined && { isActive: active === 'true' }),
                ...(lowStock === 'true' && {
                    AND: [
                        { reorderLevel: { not: null } },
                        { quantity: { lte: prisma.inventoryItem.fields.reorderLevel } }
                    ]
                })
            },
            orderBy: { name: 'asc' }
        });

        res.json(items.map(item => ({
            ...item,
            costPrice: Number(item.costPrice),
            sellingPrice: Number(item.sellingPrice),
            quantity: Number(item.quantity),
            reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
            stockValue: Number(item.costPrice) * Number(item.quantity),
            isLowStock: item.reorderLevel ? Number(item.quantity) <= Number(item.reorderLevel) : false
        })));
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

/**
 * GET /api/inventory/:id
 * Get inventory item details with movement history
 */
router.get('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const item = await prisma.inventoryItem.findFirst({
            where: {
                id: parseInt(id),
                tenantId
            },
            include: {
                movements: {
                    orderBy: { date: 'desc' },
                    take: 50
                }
            }
        });

        if (!item) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        res.json({
            ...item,
            costPrice: Number(item.costPrice),
            sellingPrice: Number(item.sellingPrice),
            quantity: Number(item.quantity),
            reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
            stockValue: Number(item.costPrice) * Number(item.quantity),
            movements: item.movements.map(m => ({
                ...m,
                quantity: Number(m.quantity),
                unitCost: m.unitCost ? Number(m.unitCost) : null
            }))
        });
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
});

/**
 * POST /api/inventory
 * Create new inventory item
 */
router.post('/', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const {
            sku,
            name,
            description,
            category,
            unit = 'pcs',
            costPrice,
            sellingPrice,
            quantity = 0,
            reorderLevel,
            assetAccountId,
            cogsAccountId
        } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        if (!sku || !name || !costPrice || !sellingPrice) {
            return res.status(400).json({
                error: 'SKU, name, cost price, and selling price are required'
            });
        }

        if (!assetAccountId || !cogsAccountId) {
            return res.status(400).json({
                error: 'Asset account and COGS account are required'
            });
        }

        // Check if SKU already exists
        const existing = await prisma.inventoryItem.findFirst({
            where: { tenantId, sku }
        });

        if (existing) {
            return res.status(400).json({ error: 'SKU already exists' });
        }

        const item = await prisma.inventoryItem.create({
            data: {
                tenantId,
                sku,
                name,
                description,
                category,
                unit,
                costPrice,
                sellingPrice,
                quantity,
                reorderLevel,
                assetAccountId: parseInt(assetAccountId),
                cogsAccountId: parseInt(cogsAccountId)
            }
        });

        res.status(201).json({
            ...item,
            costPrice: Number(item.costPrice),
            sellingPrice: Number(item.sellingPrice),
            quantity: Number(item.quantity),
            reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
            stockValue: Number(item.costPrice) * Number(item.quantity)
        });
    } catch (error) {
        console.error('Error creating inventory item:', error);
        res.status(500).json({ error: 'Failed to create inventory item' });
    }
});

/**
 * PUT /api/inventory/:id
 * Update inventory item
 */
router.put('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const {
            name,
            description,
            category,
            unit,
            costPrice,
            sellingPrice,
            reorderLevel,
            isActive
        } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const existing = await prisma.inventoryItem.findFirst({
            where: { id: parseInt(id), tenantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        const item = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(category !== undefined && { category }),
                ...(unit && { unit }),
                ...(costPrice !== undefined && { costPrice }),
                ...(sellingPrice !== undefined && { sellingPrice }),
                ...(reorderLevel !== undefined && { reorderLevel }),
                ...(isActive !== undefined && { isActive })
            }
        });

        res.json({
            ...item,
            costPrice: Number(item.costPrice),
            sellingPrice: Number(item.sellingPrice),
            quantity: Number(item.quantity),
            reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
            stockValue: Number(item.costPrice) * Number(item.quantity)
        });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
});

/**
 * POST /api/inventory/adjustment
 * Create stock adjustment with journal entry
 */
router.post('/adjustment', async (req, res) => {
    try {
        const { tenantId, id: userId } = req.user;
        const { itemId, type, quantity, unitCost, reference, notes } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        if (!itemId || !type || !quantity) {
            return res.status(400).json({
                error: 'Item ID, type, and quantity are required'
            });
        }

        if (!['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
            return res.status(400).json({
                error: 'Type must be IN, OUT, or ADJUSTMENT'
            });
        }

        const item = await prisma.inventoryItem.findFirst({
            where: { id: parseInt(itemId), tenantId }
        });

        if (!item) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        // Calculate new quantity
        let newQuantity = Number(item.quantity);
        if (type === 'IN') {
            newQuantity += quantity;
        } else if (type === 'OUT') {
            newQuantity -= quantity;
            if (newQuantity < 0) {
                return res.status(400).json({
                    error: 'Insufficient stock. Cannot reduce below zero.'
                });
            }
        } else if (type === 'ADJUSTMENT') {
            newQuantity = quantity; // Set to exact quantity
        }

        const costPerUnit = unitCost || Number(item.costPrice);
        const adjustmentValue = Math.abs(newQuantity - Number(item.quantity)) * costPerUnit;

        // Create adjustment with journal entry
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Journal Entry
            const journal = await tx.journal.create({
                data: {
                    tenantId,
                    reference: reference || `Stock Adjustment - ${item.sku}`,
                    date: new Date(),
                    description: `Stock ${type} - ${item.name}`,
                    status: 'POSTED',
                    createdById: userId
                }
            });

            // 2. Create Stock Movement
            const movement = await tx.stockMovement.create({
                data: {
                    tenantId,
                    itemId: parseInt(itemId),
                    type,
                    quantity: type === 'ADJUSTMENT'
                        ? quantity - Number(item.quantity)
                        : quantity,
                    unitCost: costPerUnit,
                    reference,
                    notes,
                    journalId: journal.id,
                    createdById: userId
                }
            });

            // 3. Create Journal Lines
            if (type === 'IN' || (type === 'ADJUSTMENT' && newQuantity > Number(item.quantity))) {
                // Increase in inventory
                // Debit: Inventory Asset
                await tx.journalLine.create({
                    data: {
                        journalId: journal.id,
                        accountId: item.assetAccountId,
                        debit: adjustmentValue,
                        credit: 0,
                        description: `Stock increase - ${item.name}`
                    }
                });

                // Credit: Inventory Adjustment (or COGS)
                await tx.journalLine.create({
                    data: {
                        journalId: journal.id,
                        accountId: item.cogsAccountId,
                        debit: 0,
                        credit: adjustmentValue,
                        description: `Stock increase - ${item.name}`
                    }
                });
            } else if (type === 'OUT' || (type === 'ADJUSTMENT' && newQuantity < Number(item.quantity))) {
                // Decrease in inventory
                // Debit: COGS (or Inventory Adjustment)
                await tx.journalLine.create({
                    data: {
                        journalId: journal.id,
                        accountId: item.cogsAccountId,
                        debit: adjustmentValue,
                        credit: 0,
                        description: `Stock decrease - ${item.name}`
                    }
                });

                // Credit: Inventory Asset
                await tx.journalLine.create({
                    data: {
                        journalId: journal.id,
                        accountId: item.assetAccountId,
                        debit: 0,
                        credit: adjustmentValue,
                        description: `Stock decrease - ${item.name}`
                    }
                });
            }

            // 4. Update inventory quantity
            await tx.inventoryItem.update({
                where: { id: parseInt(itemId) },
                data: { quantity: newQuantity }
            });

            return movement;
        });

        res.status(201).json({
            ...result,
            quantity: Number(result.quantity),
            unitCost: result.unitCost ? Number(result.unitCost) : null,
            newStockLevel: newQuantity
        });
    } catch (error) {
        console.error('Error creating stock adjustment:', error);
        res.status(500).json({ error: error.message || 'Failed to create stock adjustment' });
    }
});

/**
 * GET /api/inventory/movements
 * Get stock movement history
 */
router.get('/movements/history', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { itemId, type, startDate, endDate } = req.query;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const movements = await prisma.stockMovement.findMany({
            where: {
                tenantId,
                ...(itemId && { itemId: parseInt(itemId) }),
                ...(type && { type }),
                ...(startDate && endDate && {
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                })
            },
            include: {
                item: {
                    select: {
                        id: true,
                        sku: true,
                        name: true,
                        unit: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        res.json(movements.map(m => ({
            ...m,
            quantity: Number(m.quantity),
            unitCost: m.unitCost ? Number(m.unitCost) : null,
            value: m.unitCost ? Number(m.quantity) * Number(m.unitCost) : 0
        })));
    } catch (error) {
        console.error('Error fetching stock movements:', error);
        res.status(500).json({ error: 'Failed to fetch stock movements' });
    }
});

/**
 * GET /api/inventory/valuation
 * Get current inventory valuation
 */
router.get('/valuation/current', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const items = await prisma.inventoryItem.findMany({
            where: {
                tenantId,
                isActive: true,
                quantity: { gt: 0 }
            }
        });

        const valuation = items.map(item => ({
            id: item.id,
            sku: item.sku,
            name: item.name,
            quantity: Number(item.quantity),
            costPrice: Number(item.costPrice),
            sellingPrice: Number(item.sellingPrice),
            costValue: Number(item.quantity) * Number(item.costPrice),
            retailValue: Number(item.quantity) * Number(item.sellingPrice),
            potentialProfit: (Number(item.sellingPrice) - Number(item.costPrice)) * Number(item.quantity)
        }));

        const summary = {
            totalItems: items.length,
            totalQuantity: valuation.reduce((sum, item) => sum + item.quantity, 0),
            totalCostValue: valuation.reduce((sum, item) => sum + item.costValue, 0),
            totalRetailValue: valuation.reduce((sum, item) => sum + item.retailValue, 0),
            potentialProfit: valuation.reduce((sum, item) => sum + item.potentialProfit, 0)
        };

        res.json({
            summary,
            items: valuation
        });
    } catch (error) {
        console.error('Error calculating inventory valuation:', error);
        res.status(500).json({ error: 'Failed to calculate inventory valuation' });
    }
});

/**
 * GET /api/inventory/low-stock
 * Get items below reorder level
 */
router.get('/alerts/low-stock', async (req, res) => {
    try {
        const { tenantId } = req.user;

        if (!tenantId) {
            return res.status(400).json({ error: 'User is not part of any family' });
        }

        const items = await prisma.$queryRaw`
            SELECT * FROM inventory_items
            WHERE tenant_id = ${tenantId}
            AND is_active = true
            AND reorder_level IS NOT NULL
            AND quantity <= reorder_level
            ORDER BY (quantity / NULLIF(reorder_level, 0)) ASC
        `;

        res.json(items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            reorderLevel: Number(item.reorder_level),
            shortfall: Number(item.reorder_level) - Number(item.quantity),
            urgency: Number(item.quantity) === 0 ? 'CRITICAL' :
                Number(item.quantity) < Number(item.reorder_level) * 0.5 ? 'HIGH' : 'MEDIUM'
        })));
    } catch (error) {
        console.error('Error fetching low stock items:', error);
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
});

export default router;
