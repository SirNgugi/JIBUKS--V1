/**
 * Chart of Accounts Upgrade Script
 * Adds new professional accounting accounts to existing tenants
 * Run this after deploying the enhanced CoA template
 * 
 * Usage: node scripts/upgradeCoA.js
 */

import { prisma } from '../src/lib/prisma.js';
import { FAMILY_COA_TEMPLATE } from '../src/services/accountingService.js';

/**
 * Upgrades the Chart of Accounts for all existing tenants
 * Adds missing accounts without deleting existing ones
 */
async function upgradeCoA() {
    try {
        console.log('[UpgradeCoA] Starting Chart of Accounts upgrade...');

        // Get all tenants
        const tenants = await prisma.tenant.findMany({
            select: { id: true, name: true, tenantType: true }
        });

        console.log(`[UpgradeCoA] Found ${tenants.length} tenant(s) to upgrade`);

        let totalAccountsAdded = 0;

        for (const tenant of tenants) {
            console.log(`\n[UpgradeCoA] Processing tenant: ${tenant.name} (ID: ${tenant.id})`);

            // Get existing accounts for this tenant
            const existingAccounts = await prisma.account.findMany({
                where: { tenantId: tenant.id },
                select: { code: true, name: true }
            });

            const existingCodes = new Set(existingAccounts.map(acc => acc.code));
            console.log(`[UpgradeCoA] Tenant has ${existingAccounts.length} existing accounts`);

            // Check each template account
            let addedCount = 0;
            for (const template of FAMILY_COA_TEMPLATE) {
                if (!existingCodes.has(template.code)) {
                    try {
                        await prisma.account.create({
                            data: {
                                tenantId: tenant.id,
                                code: template.code,
                                name: template.name,
                                type: template.type,
                                description: template.description || null,
                                isSystem: template.isSystem,
                                isContra: template.isContra || false,
                                isActive: true,
                                currency: 'KES',
                            }
                        });
                        console.log(`  ✓ Added account: ${template.code} - ${template.name}`);
                        addedCount++;
                    } catch (error) {
                        console.error(`  ✗ Failed to add account ${template.code}: ${error.message}`);
                    }
                } else {
                    // Account exists, check if we need to update isContra field
                    const existingAccount = await prisma.account.findFirst({
                        where: {
                            tenantId: tenant.id,
                            code: template.code
                        },
                        select: { id: true, isContra: true }
                    });

                    // Update isContra if it's different from template
                    if (existingAccount && existingAccount.isContra !== (template.isContra || false)) {
                        try {
                            await prisma.account.update({
                                where: { id: existingAccount.id },
                                data: { isContra: template.isContra || false }
                            });
                            console.log(`  ↻ Updated isContra for account: ${template.code} - ${template.name}`);
                        } catch (error) {
                            console.error(`  ✗ Failed to update account ${template.code}: ${error.message}`);
                        }
                    }
                }
            }

            console.log(`[UpgradeCoA] Added ${addedCount} new account(s) to tenant: ${tenant.name}`);
            totalAccountsAdded += addedCount;
        }

        console.log(`\n[UpgradeCoA] ✅ Upgrade complete!`);
        console.log(`[UpgradeCoA] Total accounts added across all tenants: ${totalAccountsAdded}`);

        // Generate summary report
        console.log('\n[UpgradeCoA] === UPGRADE SUMMARY ===');
        for (const tenant of tenants) {
            const accountCount = await prisma.account.count({
                where: { tenantId: tenant.id }
            });
            console.log(`  ${tenant.name}: ${accountCount} total accounts`);
        }

    } catch (error) {
        console.error('[UpgradeCoA] ❌ Error during upgrade:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the upgrade
upgradeCoA()
    .then(() => {
        console.log('\n[UpgradeCoA] Script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n[UpgradeCoA] Script failed:', error);
        process.exit(1);
    });
