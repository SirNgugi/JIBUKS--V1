import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting Bulletproof Chart of Accounts Seeding...');

    // 1. Get the Tenant (Family)
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.error('❌ No Tenant/Family found! Please signup/login first.');
        return;
    }
    console.log(`✅ Found Tenant: ${tenant.name} (ID: ${tenant.id})`);

    // 2. Define Bulletproof Standard Accounts with system tags
    const standardAccounts = [
        // ASSETS (For Payments)
        {
            code: '1100',
            name: 'Cash on Hand',
            type: 'ASSET',
            subtype: 'cash',
            systemTag: 'CASH',
            isPaymentEligible: true,
            isSystem: true
        },
        {
            code: '1110',
            name: 'Bank Account (Main)',
            type: 'ASSET',
            subtype: 'bank',
            systemTag: 'BANK',
            isPaymentEligible: true,
            isSystem: true
        },
        {
            code: '1120',
            name: 'Mobile Money / M-Pesa',
            type: 'ASSET',
            subtype: 'bank',
            systemTag: 'MOBILE_MONEY',
            isPaymentEligible: true
        },
        {
            code: '1200',
            name: 'Accounts Receivable',
            type: 'ASSET',
            subtype: 'ar',
            systemTag: 'AR',
            isControl: true,
            allowDirectPost: false,
            isSystem: true
        },
        {
            code: '1600',
            name: 'Fixed Assets',
            type: 'ASSET',
            subtype: 'fixed_asset',
            isSystem: true
        },

        // LIABILITIES
        {
            code: '2000',
            name: 'Accounts Payable',
            type: 'LIABILITY',
            subtype: 'ap',
            systemTag: 'AP',
            isControl: true,
            allowDirectPost: false,
            isSystem: true
        },
        {
            code: '2100',
            name: 'Taxes Payable',
            type: 'LIABILITY',
            subtype: 'tax',
            systemTag: 'TAX_PAYABLE',
            isSystem: true
        },

        // EQUITY
        {
            code: '3000',
            name: 'Owner\'s Equity',
            type: 'EQUITY',
            systemTag: 'EQUITY',
            isSystem: true
        },

        // INCOME
        {
            code: '4000',
            name: 'Sales Revenue',
            type: 'INCOME',
            systemTag: 'SALES',
            isSystem: true
        },
        {
            code: '4010',
            name: 'Service Revenue',
            type: 'INCOME'
        },

        // EXPENSES (For Bills)
        {
            code: '5000',
            name: 'Cost of Goods Sold',
            type: 'EXPENSE',
            subtype: 'cogs',
            systemTag: 'COGS',
            isSystem: true
        },
        {
            code: '5100',
            name: 'Utilities',
            type: 'EXPENSE',
            subtype: 'operating_expense'
        },
        {
            code: '5110',
            name: 'Utilities: Water',
            type: 'EXPENSE',
            subtype: 'operating_expense'
        },
        {
            code: '5120',
            name: 'Utilities: Electricity',
            type: 'EXPENSE',
            subtype: 'operating_expense'
        },
        {
            code: '6000',
            name: 'Rent Expense',
            type: 'EXPENSE',
            subtype: 'operating_expense'
        },
        {
            code: '6010',
            name: 'Salaries & Wages',
            type: 'EXPENSE',
            subtype: 'operating_expense'
        },
        {
            code: '6020',
            name: 'Office Supplies',
            type: 'EXPENSE',
            subtype: 'operating_expense'
        },
        {
            code: '6030',
            name: 'Repairs & Maintenance',
            type: 'EXPENSE',
            subtype: 'operating_expense'
        },
        {
            code: '6100',
            name: 'General & Admin',
            type: 'EXPENSE',
            subtype: 'operating_expense'
        }
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const acc of standardAccounts) {
        // Check if exists by code
        const existing = await prisma.account.findFirst({
            where: {
                tenantId: tenant.id,
                code: acc.code
            }
        });

        if (!existing) {
            await prisma.account.create({
                data: {
                    tenantId: tenant.id,
                    code: acc.code,
                    name: acc.name,
                    type: acc.type,
                    subtype: acc.subtype || null,
                    systemTag: acc.systemTag || null,
                    isControl: acc.isControl || false,
                    allowDirectPost: acc.allowDirectPost !== false, // Default true unless explicitly false
                    isPaymentEligible: acc.isPaymentEligible || false,
                    isSystem: acc.isSystem || false,
                    currency: 'KES',
                    isActive: true
                }
            });
            console.log(`   ➕ Created: [${acc.type}] ${acc.name} ${acc.systemTag ? `(${acc.systemTag})` : ''}`);
            createdCount++;
        } else {
            // Update existing accounts with new fields if they're missing
            await prisma.account.update({
                where: { id: existing.id },
                data: {
                    subtype: acc.subtype || existing.subtype,
                    systemTag: acc.systemTag || existing.systemTag,
                    isControl: acc.isControl !== undefined ? acc.isControl : existing.isControl,
                    allowDirectPost: acc.allowDirectPost !== undefined ? acc.allowDirectPost : existing.allowDirectPost,
                    isPaymentEligible: acc.isPaymentEligible !== undefined ? acc.isPaymentEligible : existing.isPaymentEligible,
                    isSystem: acc.isSystem !== undefined ? acc.isSystem : existing.isSystem
                }
            });
            console.log(`   🔄 Updated: [${acc.type}] ${acc.name}`);
            updatedCount++;
        }
    }

    // 3. Create Payment Accounts for Cash and Bank
    console.log('\n💳 Setting up Payment Accounts Registry...');

    const cashAccount = await prisma.account.findFirst({
        where: { tenantId: tenant.id, systemTag: 'CASH' }
    });

    const bankAccount = await prisma.account.findFirst({
        where: { tenantId: tenant.id, systemTag: 'BANK' }
    });

    if (cashAccount) {
        const existingCashPayment = await prisma.paymentAccount.findFirst({
            where: { tenantId: tenant.id, accountId: cashAccount.id }
        });

        if (!existingCashPayment) {
            await prisma.paymentAccount.create({
                data: {
                    tenantId: tenant.id,
                    accountId: cashAccount.id,
                    name: 'Petty Cash',
                    status: 'active'
                }
            });
            console.log('   ➕ Created Payment Account: Petty Cash');
        }
    }

    if (bankAccount) {
        const existingBankPayment = await prisma.paymentAccount.findFirst({
            where: { tenantId: tenant.id, accountId: bankAccount.id }
        });

        if (!existingBankPayment) {
            await prisma.paymentAccount.create({
                data: {
                    tenantId: tenant.id,
                    accountId: bankAccount.id,
                    name: 'Main Bank Account',
                    institution: 'KCB Bank',
                    status: 'active'
                }
            });
            console.log('   ➕ Created Payment Account: Main Bank Account');
        }
    }

    console.log(`\n🎉 Seeding Complete!`);
    console.log(`   Created: ${createdCount} new accounts`);
    console.log(`   Updated: ${updatedCount} existing accounts`);
    console.log('👉 Your Chart of Accounts is now bulletproof!');
    console.log('👉 Payment dropdowns will only show Cash/Bank accounts.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
