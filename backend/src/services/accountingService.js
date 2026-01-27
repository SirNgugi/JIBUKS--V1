/**
 * Accounting Service
 * Core business logic for double-entry bookkeeping
 * 
 * This service handles:
 * - Chart of Accounts (CoA) management
 * - Journal entry creation (double-entry posting)
 * - Account balance calculations
 * - Financial reports (P&L, Trial Balance, Cash Flow)
 */

import { prisma } from '../lib/prisma.js';

// ============================================
// FAMILY CHART OF ACCOUNTS TEMPLATE
// ============================================

/**
 * Enhanced Professional Chart of Accounts
 * Supports business accounting with inventory, fixed assets, VAT, and payroll
 * Following accounting best practices with proper account numbering:
 * - 1000s: Assets
 * - 2000s: Liabilities
 * - 3000s: Equity
 * - 4000s: Income/Revenue
 * - 5000s: Expenses
 */
export const FAMILY_COA_TEMPLATE = [
    // ASSETS (1000-1999)
    // Cash & Bank Accounts (1000-1099)
    { code: '1000', name: 'Cash on Hand', type: 'ASSET', description: 'Physical cash', isSystem: true, isContra: false, isPaymentEligible: true, subtype: 'cash' },
    { code: '1010', name: 'Checking Account', type: 'ASSET', description: 'Bank checking account', isSystem: true, isContra: false, isPaymentEligible: true, subtype: 'bank' },
    { code: '1020', name: 'Savings Account', type: 'ASSET', description: 'Bank savings account', isSystem: true, isContra: false, isPaymentEligible: true, subtype: 'bank' },
    { code: '1030', name: 'M-Pesa Wallet', type: 'ASSET', description: 'Mobile money wallet', isSystem: true, isContra: false, isPaymentEligible: true, subtype: 'cash' },
    { code: '1040', name: 'Airtel Money', type: 'ASSET', description: 'Airtel Money wallet', isSystem: false, isContra: false, isPaymentEligible: true, subtype: 'cash' },
    { code: '1050', name: 'PayPal', type: 'ASSET', description: 'PayPal account', isSystem: false, isContra: false, isPaymentEligible: true, subtype: 'bank' },
    { code: '1060', name: 'Undeposited Funds', type: 'ASSET', description: 'Cash received not yet deposited', isSystem: true, isContra: false, subtype: 'cash' },
    { code: '1070', name: 'Clearing Account', type: 'ASSET', description: 'Temporary clearing account', isSystem: true, isContra: false, subtype: 'other_asset' },

    // Receivables (1100-1199)
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET', description: 'Money owed by customers', isSystem: true, isContra: false, subtype: 'ar' },
    { code: '1110', name: 'Notes Receivable', type: 'ASSET', description: 'Promissory notes from customers', isSystem: false, isContra: false, subtype: 'other_asset' },

    // Prepayments (1200-1299)
    { code: '1200', name: 'Prepaid Expenses', type: 'ASSET', description: 'Advance payments', isSystem: false, isContra: false, subtype: 'other_asset' },
    { code: '1210', name: 'Prepaid Rent', type: 'ASSET', description: 'Rent paid in advance', isSystem: false, isContra: false },
    { code: '1220', name: 'Prepaid Insurance', type: 'ASSET', description: 'Insurance paid in advance', isSystem: false, isContra: false },

    // Inventory (1300-1399)
    { code: '1300', name: 'Inventory - Finished Goods', type: 'ASSET', description: 'Finished products ready for sale', isSystem: true, isContra: false, subtype: 'inventory' },
    { code: '1310', name: 'Inventory - Raw Materials', type: 'ASSET', description: 'Raw materials for production', isSystem: false, isContra: false },
    { code: '1320', name: 'Inventory - Work in Progress', type: 'ASSET', description: 'Goods in production', isSystem: false, isContra: false },

    // VAT (1400-1499)
    { code: '1400', name: 'VAT Receivable (Input VAT)', type: 'ASSET', description: 'VAT paid on purchases (16%)', isSystem: true, isContra: false, subtype: 'tax' },

    // Fixed Assets (1500-1599)
    { code: '1500', name: 'Equipment', type: 'ASSET', description: 'Business equipment', isSystem: true, isContra: false, subtype: 'fixed_asset' },
    { code: '1510', name: 'Furniture & Fixtures', type: 'ASSET', description: 'Office furniture', isSystem: false, isContra: false, subtype: 'fixed_asset' },
    { code: '1520', name: 'Vehicles', type: 'ASSET', description: 'Company vehicles', isSystem: false, isContra: false, subtype: 'fixed_asset' },
    { code: '1530', name: 'Buildings', type: 'ASSET', description: 'Real estate property', isSystem: false, isContra: false, subtype: 'fixed_asset' },
    { code: '1590', name: 'Accumulated Depreciation', type: 'ASSET', description: 'Contra-asset for depreciation', isSystem: true, isContra: true, subtype: 'fixed_asset' },

    // LIABILITIES (2000-2999)
    // Current Liabilities (2000-2099)
    { code: '2000', name: 'Credit Card', type: 'LIABILITY', description: 'Credit card balances', isSystem: true, isContra: false, isPaymentEligible: true, subtype: 'credit_card' },
    { code: '2010', name: 'Loans Payable', type: 'LIABILITY', description: 'Personal/business loans', isSystem: true, isContra: false, subtype: 'liabilities' },
    { code: '2020', name: 'Accounts Payable', type: 'LIABILITY', description: 'Money owed to suppliers', isSystem: true, isContra: false, subtype: 'ap' },
    { code: '2030', name: 'Mortgage', type: 'LIABILITY', description: 'Home/property loan', isSystem: false, isContra: false, subtype: 'liabilities' },

    // VAT (2500-2599)
    { code: '2500', name: 'VAT Payable (Output VAT)', type: 'LIABILITY', description: 'VAT collected on sales (16%)', isSystem: true, isContra: false, subtype: 'tax' },

    // Customer Deposits (2600-2699)
    { code: '2600', name: 'Customer Deposits', type: 'LIABILITY', description: 'Advance payments from customers', isSystem: true, isContra: false },
    { code: '2610', name: 'Unearned Revenue', type: 'LIABILITY', description: 'Revenue received in advance', isSystem: false, isContra: false },

    // Payroll Liabilities (2700-2799)
    { code: '2700', name: 'PAYE Payable', type: 'LIABILITY', description: 'Income tax withheld from employees', isSystem: true, isContra: false, subtype: 'liabilities' },
    { code: '2710', name: 'NSSF Payable', type: 'LIABILITY', description: 'National Social Security Fund', isSystem: true, isContra: false },
    { code: '2720', name: 'NHIF Payable', type: 'LIABILITY', description: 'National Hospital Insurance Fund', isSystem: true, isContra: false },

    // EQUITY (3000-3999)
    { code: '3000', name: 'Owner Equity', type: 'EQUITY', description: 'Owner capital / Opening balance', isSystem: true, isContra: false, subtype: 'equity' },
    { code: '3010', name: 'Retained Earnings', type: 'EQUITY', description: 'Accumulated profits/savings', isSystem: true, isContra: false, subtype: 'equity' },
    { code: '3020', name: 'Drawings', type: 'EQUITY', description: 'Owner withdrawals', isSystem: false, isContra: true, subtype: 'equity' },

    // INCOME (4000-4999)
    // Personal Income (4000-4099)
    { code: '4000', name: 'Salary Income', type: 'INCOME', description: 'Employment salary', isSystem: true, isContra: false, subtype: 'income' },
    { code: '4010', name: 'Business Income', type: 'INCOME', description: 'Side business / freelance', isSystem: true, isContra: false, subtype: 'income' },
    { code: '4020', name: 'Investment Income', type: 'INCOME', description: 'Dividends, interest', isSystem: true, isContra: false, subtype: 'income' },
    { code: '4030', name: 'Gift Income', type: 'INCOME', description: 'Monetary gifts received', isSystem: true, isContra: false, subtype: 'income' },
    { code: '4040', name: 'Rental Income', type: 'INCOME', description: 'Property rental income', isSystem: false, isContra: false, subtype: 'income' },
    { code: '4050', name: 'Other Income', type: 'INCOME', description: 'Miscellaneous income', isSystem: true, isContra: false, subtype: 'income' },

    // Sales Revenue (4100-4199)
    { code: '4100', name: 'Product Sales', type: 'INCOME', description: 'Revenue from product sales', isSystem: true, isContra: false },
    { code: '4110', name: 'Service Sales', type: 'INCOME', description: 'Revenue from service sales', isSystem: true, isContra: false },
    { code: '4120', name: 'Sales Returns', type: 'INCOME', description: 'Returns and refunds (contra-revenue)', isSystem: true, isContra: true },
    { code: '4130', name: 'Sales Discounts', type: 'INCOME', description: 'Discounts given to customers (contra-revenue)', isSystem: true, isContra: true },

    // Other Revenue (4200-4299)
    { code: '4200', name: 'Interest Income', type: 'INCOME', description: 'Interest earned on deposits', isSystem: false, isContra: false },
    { code: '4210', name: 'Late Fee Income', type: 'INCOME', description: 'Late payment fees from customers', isSystem: false, isContra: false },

    // EXPENSES (6000-6999) - NEW 6000 SERIES FAMILY STRUCTURE

    // 6000 - Housing & Utilities
    { code: '6000', name: 'Housing & Utilities', type: 'EXPENSE', description: 'Parent Category: Housing', isSystem: true, subtype: 'operating_expense' },
    { code: '6010', name: 'Rent Expense', type: 'EXPENSE', description: 'Monthly rent', parentCode: '6000', subtype: 'operating_expense' },
    { code: '6020', name: 'Mortgage Interest', type: 'EXPENSE', description: 'Interest portion of mortgage', parentCode: '6000', subtype: 'operating_expense' },
    { code: '6030', name: 'Property Taxes', type: 'EXPENSE', description: 'Property tax payments', parentCode: '6000', subtype: 'operating_expense' },
    { code: '6040', name: 'Electricity / Power', type: 'EXPENSE', description: 'Electricity bills', parentCode: '6000', subtype: 'operating_expense' },
    { code: '6050', name: 'Water & Sewer', type: 'EXPENSE', description: 'Water bills', parentCode: '6000', subtype: 'operating_expense' },
    { code: '6060', name: 'Internet & Cable', type: 'EXPENSE', description: 'Internet and TV', parentCode: '6000', subtype: 'operating_expense' },
    { code: '6070', name: 'Home Repairs & Maintenance', type: 'EXPENSE', description: 'Fixes and upkeep', parentCode: '6000', subtype: 'operating_expense' },
    { code: '6080', name: 'House Cleaning Services', type: 'EXPENSE', description: 'Cleaning help', parentCode: '6000', subtype: 'operating_expense' },

    // 6100 - Food & Living
    { code: '6100', name: 'Food & Living', type: 'EXPENSE', description: 'Parent Category: Food', isSystem: true, subtype: 'operating_expense' },
    { code: '6110', name: 'Groceries', type: 'EXPENSE', description: 'Essential food', parentCode: '6100', subtype: 'operating_expense' },
    { code: '6120', name: 'Dining Out', type: 'EXPENSE', description: 'Restaurants & delivery', parentCode: '6100', subtype: 'operating_expense' },
    { code: '6130', name: 'Personal Care', type: 'EXPENSE', description: 'Haircuts, hygiene', parentCode: '6100', subtype: 'operating_expense' },
    { code: '6140', name: 'Clothing & Shoes', type: 'EXPENSE', description: 'Apparel', parentCode: '6100', subtype: 'operating_expense' },
    { code: '6150', name: 'Laundry & Dry Cleaning', type: 'EXPENSE', description: 'Cleaning clothes', parentCode: '6100', subtype: 'operating_expense' },

    // 6200 - Transportation
    { code: '6200', name: 'Transportation', type: 'EXPENSE', description: 'Parent Category: Transport', isSystem: true, subtype: 'operating_expense' },
    { code: '6210', name: 'Fuel / Gas', type: 'EXPENSE', description: 'Fuel for vehicles', parentCode: '6200', subtype: 'operating_expense' },
    { code: '6220', name: 'Auto Insurance', type: 'EXPENSE', description: 'Car insurance', parentCode: '6200', subtype: 'operating_expense' },
    { code: '6230', name: 'Car Repairs', type: 'EXPENSE', description: 'Vehicle maintenance', parentCode: '6200', subtype: 'operating_expense' },
    { code: '6240', name: 'Parking & Tolls', type: 'EXPENSE', description: 'Parking fees', parentCode: '6200', subtype: 'operating_expense' },
    { code: '6250', name: 'Public Transport / Uber', type: 'EXPENSE', description: 'Bus, taxi, rideshare', parentCode: '6200', subtype: 'operating_expense' },
    { code: '6260', name: 'Vehicle Registration', type: 'EXPENSE', description: 'Licenses and taxes', parentCode: '6200', subtype: 'operating_expense' },

    // 6300 - Health & Wellness
    { code: '6300', name: 'Health & Wellness', type: 'EXPENSE', description: 'Parent Category: Health', isSystem: true, subtype: 'operating_expense' },
    { code: '6310', name: 'Health Insurance', type: 'EXPENSE', description: 'Premiums', parentCode: '6300', subtype: 'operating_expense' },
    { code: '6320', name: 'Doctors & Dental', type: 'EXPENSE', description: 'Visits and checkups', parentCode: '6300', subtype: 'operating_expense' },
    { code: '6330', name: 'Pharmacy', type: 'EXPENSE', description: 'Medicine and drugs', parentCode: '6300', subtype: 'operating_expense' },
    { code: '6340', name: 'Gym & Fitness', type: 'EXPENSE', description: 'Memberships and gear', parentCode: '6300', subtype: 'operating_expense' },

    // 6400 - Education & Family
    { code: '6400', name: 'Education & Family', type: 'EXPENSE', description: 'Parent Category: Family', isSystem: true, subtype: 'operating_expense' },
    { code: '6410', name: 'School Tuition', type: 'EXPENSE', description: 'Classes and fees', parentCode: '6400', subtype: 'operating_expense' },
    { code: '6420', name: 'School Supplies', type: 'EXPENSE', description: 'Books and stationery', parentCode: '6400', subtype: 'operating_expense' },
    { code: '6430', name: 'Childcare / Nanny', type: 'EXPENSE', description: 'Babysitting and help', parentCode: '6400', subtype: 'operating_expense' },
    { code: '6440', name: 'Activities', type: 'EXPENSE', description: 'Sports, music, hobbies', parentCode: '6400', subtype: 'operating_expense' },
    { code: '6450', name: 'Pet Care', type: 'EXPENSE', description: 'Vet, food, grooming', parentCode: '6400', subtype: 'operating_expense' },

    // 6500 - Entertainment
    { code: '6500', name: 'Entertainment', type: 'EXPENSE', description: 'Parent Category: Fun', isSystem: true, subtype: 'operating_expense' },
    { code: '6510', name: 'Subscriptions', type: 'EXPENSE', description: 'Netflix, Spotify, App services', parentCode: '6500', subtype: 'operating_expense' },
    { code: '6520', name: 'Movies & Events', type: 'EXPENSE', description: 'Outings and tickets', parentCode: '6500', subtype: 'operating_expense' },
    { code: '6530', name: 'Hobbies', type: 'EXPENSE', description: 'Personal interests', parentCode: '6500', subtype: 'operating_expense' },
    { code: '6540', name: 'Travel & Vacation', type: 'EXPENSE', description: 'Trips and holidays', parentCode: '6500', subtype: 'operating_expense' },

    // 6600 - Financial Fees
    { code: '6600', name: 'Financial Fees', type: 'EXPENSE', description: 'Parent Category: Fees', isSystem: true, subtype: 'operating_expense' },
    { code: '6610', name: 'Bank Charges', type: 'EXPENSE', description: 'Service fees', parentCode: '6600', subtype: 'operating_expense' },
    { code: '6620', name: 'Credit Card Interest', type: 'EXPENSE', description: 'Interest paid', parentCode: '6600', subtype: 'operating_expense' },
    { code: '6630', name: 'Late Fees', type: 'EXPENSE', description: 'Penalties', parentCode: '6600', subtype: 'operating_expense' },

    // Other Standard Business/Mixed
    { code: '5199', name: 'Uncategorized Expense', type: 'EXPENSE', description: 'To be sorted', isSystem: true, subtype: 'operating_expense' },
    { code: '5200', name: 'Cost of Goods Sold', type: 'EXPENSE', description: 'Direct business costs', isSystem: false, subtype: 'cogs' },
    { code: '5400', name: 'Salaries & Wages', type: 'EXPENSE', description: 'Employee salaries', isSystem: false, subtype: 'operating_expense' },
];

// ============================================
// CATEGORY TO ACCOUNT MAPPING
// ============================================

/**
 * Maps frontend category names to account codes
 * This allows transactions to be recorded with user-friendly category names
 * while automatically posting to the correct accounting accounts
 */
export const CATEGORY_ACCOUNT_MAP = {
    // Income Categories
    'Salary': { incomeAccount: '4000', defaultAssetAccount: '1010' },
    'Business': { incomeAccount: '4010', defaultAssetAccount: '1010' },
    'Investment': { incomeAccount: '4020', defaultAssetAccount: '1010' },
    'Gift': { incomeAccount: '4030', defaultAssetAccount: '1000' },
    'Rental': { incomeAccount: '4040', defaultAssetAccount: '1010' },
    'Other Income': { incomeAccount: '4050', defaultAssetAccount: '1000' },

    // Sales Revenue
    'Product Sales': { incomeAccount: '4100', defaultAssetAccount: '1010' },
    'Service Sales': { incomeAccount: '4110', defaultAssetAccount: '1010' },

    // Expense Categories (Aligned to new 6000 series)
    'Food': { expenseAccount: '6100', defaultAssetAccount: '1000' },
    'Groceries': { expenseAccount: '6110', defaultAssetAccount: '1000' },
    'Transport': { expenseAccount: '6200', defaultAssetAccount: '1000' },
    'Housing': { expenseAccount: '6000', defaultAssetAccount: '1010' },
    'Rent': { expenseAccount: '6010', defaultAssetAccount: '1010' },
    'Utilities': { expenseAccount: '6000', defaultAssetAccount: '1010' },
    'Healthcare': { expenseAccount: '6300', defaultAssetAccount: '1000' },
    'Education': { expenseAccount: '6400', defaultAssetAccount: '1010' },
    'Entertainment': { expenseAccount: '6500', defaultAssetAccount: '1000' },
    'Shopping': { expenseAccount: '6140', defaultAssetAccount: '1000' },
    'Communication': { expenseAccount: '6060', defaultAssetAccount: '1030' },
    'Insurance': { expenseAccount: '6310', defaultAssetAccount: '1010' },
    'Donations': { expenseAccount: '5199', defaultAssetAccount: '1000' },
    'Other Expenses': { expenseAccount: '5199', defaultAssetAccount: '1000' },

    // Business Expense Categories
    'COGS': { expenseAccount: '5200', defaultAssetAccount: '1300' },
    'Bank Charges': { expenseAccount: '6610', defaultAssetAccount: '1010' },
    'Interest Expense': { expenseAccount: '6620', defaultAssetAccount: '1010' },
    'Depreciation': { expenseAccount: '5300', defaultAssetAccount: '1590' },
    'Salaries': { expenseAccount: '5400', defaultAssetAccount: '1010' },

    // Additional Standard Categories
    'Subscriptions': { expenseAccount: '6510', defaultAssetAccount: '1000' },
    'Personal Care': { expenseAccount: '6130', defaultAssetAccount: '1000' },
    'Pet Care': { expenseAccount: '6450', defaultAssetAccount: '1000' },
    'Childcare': { expenseAccount: '6430', defaultAssetAccount: '1000' },
    'Gym': { expenseAccount: '6340', defaultAssetAccount: '1000' },
    'Fitness': { expenseAccount: '6340', defaultAssetAccount: '1000' },
};

const KEYWORD_ACCOUNT_MAP = {
    // Transport
    'uber': '6250', 'bolt': '6250', 'lyft': '6250', 'taxify': '6250', 'taxi': '6250',
    'fuel': '6210', 'gas': '6210', 'petrol': '6210', 'diesel': '6210', 'shell': '6210', 'total': '6210',
    'parking': '6240', 'toll': '6240',
    'bus': '6250', 'matatu': '6250', 'fare': '6250',
    'auto': '6230', 'mechanic': '6230', 'repair': '6230', 'service': '6230',

    // Food
    'restaurant': '6120', 'cafe': '6120', 'coffee': '6120', 'java': '6120', 'artcaffe': '6120', 'kfc': '6120', 'burger': '6120', 'pizza': '6120', 'dinner': '6120', 'lunch': '6120', 'breakfast': '6120',
    'supermarket': '6110', 'grocy': '6110', 'naivas': '6110', 'carrefour': '6110', 'quickmart': '6110', 'chandarana': '6110',

    // Utilities
    'kplc': '6040', 'power': '6040', 'electricity': '6040', 'token': '6040',
    'water': '6050', 'sewer': '6050', 'nairobi water': '6050',
    'internet': '6060', 'wifi': '6060', 'zuku': '6060', 'safaricom home': '6060', 'jtl': '6060', 'starlink': '6060',
    'airtime': '6060', 'safaricom': '6060', 'airtel': '6060', 'telkom': '6060', 'data': '6060', 'bundle': '6060',

    // Housing
    'rent': '6010', 'landlord': '6010', 'housing': '6010',
    'clean': '6080', 'maid': '6080', 'househelp': '6080',

    // Subscriptions
    'netflix': '6510', 'spotify': '6510', 'youtube': '6510', 'prime': '6510', 'apple': '6510', 'showmax': '6510', 'dstv': '6060', 'gotv': '6060',

    // Shopping
    'cloth': '6140', 'shoe': '6140', 'wear': '6140', 'fashion': '6140', 'dress': '6140', 'shirt': '6140',
    'jumia': '5199', 'amazon': '5199',

    // Entertainment
    'movie': '6520', 'cinema': '6520', 'imax': '6520', 'ticket': '6520',
    'game': '6530', 'bet': '6530', 'sport': '6440',

    // Healthcare
    'drug': '6330', 'pharmacy': '6330', 'chemist': '6330', 'med': '6330',
    'doctor': '6320', 'hospital': '6320', 'clinic': '6320', 'consultation': '6320', 'dental': '6320', 'dentist': '6320',
    'insurance': '6310', 'nhif': '6310', 'premium': '6310',
    'gym': '6340', 'fitness': '6340', 'workout': '6340',

    // Education
    'school': '6410', 'tuition': '6410', 'fee': '6410', 'university': '6410', 'college': '6410',
    'book': '6420', 'course': '6410', 'class': '6410', 'stationery': '6420', 'uniform': '6420',

    // Family
    'nanny': '6430', 'baby': '6430', 'child': '6430', 'daycare': '6430',
    'pet': '6450', 'vet': '6450', 'dog': '6450', 'cat': '6450',
};

// ============================================
// ACCOUNT SEEDING SERVICE
// ============================================

/**
 * Seeds the Chart of Accounts for a new family tenant
 * Called automatically when a new family is created
 * 
 * @param {number} tenantId - The tenant ID to seed accounts for
 * @param {string} currency - Default currency (default: KES)
 */
export async function seedFamilyCoA(tenantId, currency = 'KES') {
    try {
        // Check if accounts already exist (just for logging)
        const existingAccounts = await prisma.account.count({
            where: { tenantId }
        });

        if (existingAccounts > 0) {
            console.log(`[AccountingService] Tenant ${tenantId} has ${existingAccounts} accounts. Proceeding to sync/seed new accounts...`);
        }

        // 1. First Pass: Create all accounts (without parent links)
        // usage of skipDuplicates ensures we don't fail on existing accounts
        const accountsToCreate = FAMILY_COA_TEMPLATE.map(acc => ({
            tenantId,
            code: acc.code,
            name: acc.name,
            type: acc.type,
            subtype: acc.subtype,
            description: acc.description || null,
            isSystem: acc.isSystem || false,
            isContra: acc.isContra || false,
            isPaymentEligible: acc.isPaymentEligible || false,
            isActive: true,
            currency,
        }));

        await prisma.account.createMany({
            data: accountsToCreate,
            skipDuplicates: true,
        });

        console.log(`[AccountingService] Synced base accounts`);

        // 2. Second Pass: Link Parents
        // We need to fetch the created accounts to get their IDs
        const createdAccounts = await prisma.account.findMany({
            where: { tenantId },
            select: { id: true, code: true }
        });

        // Create a map for quick lookup: code -> id
        const accountMap = {};
        createdAccounts.forEach(acc => {
            accountMap[acc.code] = acc.id;
        });

        // Loop through template and update parents where applicable
        let parentUpdates = 0;
        for (const templateAcc of FAMILY_COA_TEMPLATE) {
            if (templateAcc.parentCode) {
                const childId = accountMap[templateAcc.code];
                const parentId = accountMap[templateAcc.parentCode];

                if (childId && parentId) {
                    await prisma.account.update({
                        where: { id: childId },
                        data: { parentId }
                    });
                    parentUpdates++;
                }
            }
        }

        console.log(`[AccountingService] Linked ${parentUpdates} parent-child relationships`);

        return accountsToCreate.length;
    } catch (error) {
        console.error('[AccountingService] Error seeding CoA:', error);
        throw error;
    }
}

// ============================================
// CATEGORY TEMPLATE
// ============================================

/**
 * Standard Family Categories Template
 * These categories map to the Chart of Accounts
 */
const FAMILY_CATEGORIES_TEMPLATE = [
    // Income Categories
    { name: 'Salary', type: 'income', icon: '💼', color: '#10B981' },
    { name: 'Business', type: 'income', icon: '🏢', color: '#3B82F6' },
    { name: 'Investment', type: 'income', icon: '📈', color: '#8B5CF6' },
    { name: 'Gift', type: 'income', icon: '🎁', color: '#EC4899' },
    { name: 'Rental', type: 'income', icon: '🏠', color: '#F59E0B' },
    { name: 'Other Income', type: 'income', icon: '💰', color: '#6EE7B7' },

    // Expense Categories
    { name: 'Food', type: 'expense', icon: '🍔', color: '#EF4444' },
    { name: 'Transport', type: 'expense', icon: '🚗', color: '#F97316' },
    { name: 'Housing', type: 'expense', icon: '🏡', color: '#84CC16' },
    { name: 'Utilities', type: 'expense', icon: '💡', color: '#14B8A6' },
    { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#06B6D4' },
    { name: 'Education', type: 'expense', icon: '📚', color: '#3B82F6' },
    { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#8B5CF6' },
    { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#EC4899' },
    { name: 'Communication', type: 'expense', icon: '📱', color: '#F43F5E' },
    { name: 'Insurance', type: 'expense', icon: '🛡️', color: '#64748B' },
    { name: 'Donations', type: 'expense', icon: '🤝', color: '#10B981' },
    { name: 'Other Expenses', type: 'expense', icon: '📦', color: '#6B7280' },
];

/**
 * Seeds categories for a new family tenant
 * Called automatically when a new family is created
 * 
 * @param {number} tenantId - The tenant ID to seed categories for
 */
export async function seedFamilyCategories(tenantId) {
    try {
        // Create all categories from template, skipping duplicates if they exist
        const categoriesToCreate = FAMILY_CATEGORIES_TEMPLATE.map(cat => ({
            tenantId,
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
        }));

        await prisma.category.createMany({
            data: categoriesToCreate,
            skipDuplicates: true,
        });

        // Clean up duplicates if any somehow exist (simple name-based check)
        // Group by name/type and delete ids that are not the first one
        // Note: Prisma doesn't have a simple distinct-delete, so we do this manually if needed.
        // For now, createMany with skipDuplicates handles the "Preventing future creation" part.
        // To fix CURRENT duplicates, we can run a cleanup query.

        console.log(`[AccountingService] Synced/Seeded categories for tenant ${tenantId}`);

        return categoriesToCreate.length;
    } catch (error) {
        console.error('[AccountingService] Error seeding categories:', error);
        throw error;
    }
}

// ============================================
// PAYMENT METHODS TEMPLATE
// ============================================

/**
 * Standard Family Payment Methods Template
 */
const FAMILY_PAYMENT_METHODS_TEMPLATE = [
    { name: 'Cash', type: 'cash', details: { description: 'Physical cash payments' } },
    { name: 'M-Pesa', type: 'mobile_money', details: { provider: 'Safaricom' } },
    { name: 'Bank Transfer', type: 'bank', details: { description: 'Direct bank transfers' } },
    { name: 'Credit Card', type: 'card', details: { cardType: 'credit' } },
    { name: 'Debit Card', type: 'card', details: { cardType: 'debit' } },
];

/**
 * Seeds payment methods for a new family tenant
 * Called automatically when a new family is created
 * 
 * @param {number} tenantId - The tenant ID to seed payment methods for
 */
export async function seedFamilyPaymentMethods(tenantId) {
    try {
        // Check if payment methods already exist
        const existingPaymentMethods = await prisma.paymentMethod.count({
            where: { tenantId }
        });

        if (existingPaymentMethods > 0) {
            console.log(`[AccountingService] Tenant ${tenantId} already has ${existingPaymentMethods} payment methods, skipping seed`);
            return;
        }

        // Create all payment methods from template
        const paymentMethodsToCreate = FAMILY_PAYMENT_METHODS_TEMPLATE.map(pm => ({
            tenantId,
            name: pm.name,
            type: pm.type,
            details: pm.details,
            isActive: true,
        }));

        await prisma.paymentMethod.createMany({
            data: paymentMethodsToCreate,
        });

        console.log(`[AccountingService] Seeded ${paymentMethodsToCreate.length} payment methods for tenant ${tenantId}`);

        return paymentMethodsToCreate.length;
    } catch (error) {
        console.error('[AccountingService] Error seeding payment methods:', error);
        throw error;
    }
}

// ============================================
// ACCOUNT MAPPING SERVICE
// ============================================

/**
 * Gets the account mapping for a transaction category
 * Returns the appropriate debit and credit account codes
 * 
 * @param {string} category - Transaction category name
 * @param {string} type - Transaction type (INCOME or EXPENSE)
 * @returns {Object} Mapping with debitAccountCode and creditAccountCode
 */
export function getAccountMapping(category, type) {
    // 1. Exact or Alias Map Lookup
    let mapping = CATEGORY_ACCOUNT_MAP[category];

    // 2. Keyword Lookup (if no exact match and type is EXPENSE)
    if (!mapping && type === 'EXPENSE' && category) {
        const lowerCat = category.toLowerCase();
        for (const [keyword, code] of Object.entries(KEYWORD_ACCOUNT_MAP)) {
            if (lowerCat.includes(keyword)) {
                mapping = {
                    expenseAccount: code,
                    defaultAssetAccount: '1000'
                };
                break;
            }
        }
    }

    if (!mapping) {
        // Default fallback
        if (type === 'INCOME') {
            return {
                debitAccountCode: '1000',  // Cash
                creditAccountCode: '4050', // Other Income
            };
        } else {
            return {
                debitAccountCode: '5199', // Other Expenses
                creditAccountCode: '1000', // Cash
            };
        }
    }

    if (type === 'INCOME') {
        return {
            debitAccountCode: mapping.defaultAssetAccount,
            creditAccountCode: mapping.incomeAccount,
        };
    } else {
        return {
            debitAccountCode: mapping.expenseAccount,
            creditAccountCode: mapping.defaultAssetAccount,
        };
    }
}

/**
 * Resolves account codes to account IDs for a tenant
 * 
 * @param {number} tenantId 
 * @param {string} debitCode 
 * @param {string} creditCode 
 * @returns {Object} { debitAccountId, creditAccountId }
 */
export async function resolveAccountIds(tenantId, debitCode, creditCode) {
    const [debitAccount, creditAccount] = await Promise.all([
        prisma.account.findFirst({ where: { tenantId, code: debitCode } }),
        prisma.account.findFirst({ where: { tenantId, code: creditCode } }),
    ]);

    return {
        debitAccountId: debitAccount?.id || null,
        creditAccountId: creditAccount?.id || null,
    };
}

// ============================================
// JOURNAL POSTING SERVICE
// ============================================

/**
 * Creates a double-entry journal posting
 * This is the core accounting function that ensures every transaction
 * has balanced debits and credits
 * 
 * @param {Object} params
 * @param {number} params.tenantId - Tenant ID
 * @param {number} params.debitAccountId - Account to debit
 * @param {number} params.creditAccountId - Account to credit
 * @param {number} params.amount - Transaction amount
 * @param {string} params.description - Journal description
 * @param {Date} params.date - Transaction date
 * @param {number} params.createdById - User creating the entry
 * @returns {Object} Created journal with lines
 */
export async function createJournalEntry({
    tenantId,
    debitAccountId,
    creditAccountId,
    lines, // Optional: Array of { accountId, debit, credit, description }
    amount,
    description,
    date = new Date(),
    createdById = null,
}) {
    let journalLines = [];

    // Scenario 1: Legacy (Debit/Credit pair provided)
    if (!lines) {
        // Validate: Both accounts must exist
        if (!debitAccountId || !creditAccountId) {
            throw new Error('Both debit and credit accounts are required');
        }

        // Validate: Amount must be positive
        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than zero');
        }

        journalLines = [
            {
                accountId: debitAccountId,
                debit: amount,
                credit: 0,
                description: `Debit: ${description}`,
            },
            {
                accountId: creditAccountId,
                debit: 0,
                credit: amount,
                description: `Credit: ${description}`,
            }
        ];
    }
    // Scenario 2: Explicit Lines (Split Transaction)
    else {
        if (!Array.isArray(lines) || lines.length < 2) {
            throw new Error('Journal must have at least 2 lines');
        }

        // Calculate totals to ensure balance
        const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
        const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

        // Allow strictly equal or very close (floating point tolerance)
        if (Math.abs(totalDebit - totalCredit) > 0.05) {
            throw new Error(`Journal Entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
        }

        journalLines = lines;
    }

    // Create journal entry with lines in a transaction
    const journal = await prisma.$transaction(async (tx) => {
        // 1. Create journal header
        const journalEntry = await tx.journal.create({
            data: {
                tenantId,
                description,
                date,
                status: 'POSTED',
                createdById,
                reference: `JE-${Date.now()}`,
            },
        });

        // 2. Create lines
        for (const line of journalLines) {
            await tx.journalLine.create({
                data: {
                    journalId: journalEntry.id,
                    accountId: line.accountId,
                    debit: Number(line.debit || 0),
                    credit: Number(line.credit || 0),
                    description: line.description || description,
                },
            });
        }

        // Return journal with lines
        return tx.journal.findUnique({
            where: { id: journalEntry.id },
            include: {
                lines: {
                    include: {
                        account: { select: { id: true, code: true, name: true, type: true } },
                    },
                },
            },
        });
    });

    console.log(`[AccountingService] Created journal ${journal.id} with ${journal.lines.length} lines`);

    return journal;
}

/**
 * Voids a journal entry (reverses the transaction)
 * 
 * @param {number} journalId 
 */
export async function voidJournalEntry(journalId) {
    const journal = await prisma.journal.findUnique({
        where: { id: journalId },
        include: { lines: true },
    });

    if (!journal) {
        throw new Error('Journal entry not found');
    }

    if (journal.status === 'VOID') {
        throw new Error('Journal entry is already voided');
    }

    // Create reversing entry
    await prisma.$transaction(async (tx) => {
        // Mark original as void
        await tx.journal.update({
            where: { id: journalId },
            data: { status: 'VOID' },
        });

        // Create reversing journal
        const reversingJournal = await tx.journal.create({
            data: {
                tenantId: journal.tenantId,
                description: `REVERSAL: ${journal.description}`,
                date: new Date(),
                status: 'POSTED',
                reference: `REV-${journal.reference}`,
            },
        });

        // Create reversed lines (swap debit/credit)
        for (const line of journal.lines) {
            await tx.journalLine.create({
                data: {
                    journalId: reversingJournal.id,
                    accountId: line.accountId,
                    debit: line.credit,  // Swap
                    credit: line.debit,  // Swap
                    description: `Reversal of: ${line.description || ''}`,
                },
            });
        }
    });

    console.log(`[AccountingService] Voided journal ${journalId}`);
}

// ============================================
// ACCOUNT BALANCE SERVICE
// ============================================

/**
 * Calculates the current balance for an account
 * Uses the accounting equation:
 * - Assets/Expenses: Debit increases, Credit decreases (balance = debits - credits)
 * - Liabilities/Equity/Income: Credit increases, Debit decreases (balance = credits - debits)
 * 
 * @param {number} accountId 
 * @returns {number} Current balance
 */
export async function getAccountBalance(accountId) {
    const account = await prisma.account.findUnique({
        where: { id: accountId },
    });

    if (!account) {
        throw new Error('Account not found');
    }

    // Aggregate debits and credits
    const totals = await prisma.journalLine.aggregate({
        where: {
            accountId,
            journal: { status: 'POSTED' },
        },
        _sum: {
            debit: true,
            credit: true,
        },
    });

    const totalDebits = Number(totals._sum.debit || 0);
    const totalCredits = Number(totals._sum.credit || 0);

    // Calculate balance based on account type
    let balance;
    if (['ASSET', 'EXPENSE'].includes(account.type)) {
        // Normal debit balance accounts
        balance = totalDebits - totalCredits;
    } else {
        // Normal credit balance accounts (LIABILITY, EQUITY, INCOME)
        balance = totalCredits - totalDebits;
    }

    return balance;
}

/**
 * Gets all account balances for a tenant
 * 
 * @param {number} tenantId 
 * @returns {Array} Accounts with calculated balances
 */
export async function getAllAccountBalances(tenantId) {
    const accounts = await prisma.account.findMany({
        where: { tenantId, isActive: true },
        orderBy: { code: 'asc' },
    });

    const accountsWithBalances = await Promise.all(
        accounts.map(async (account) => {
            const balance = await getAccountBalance(account.id);
            return { ...account, balance };
        })
    );

    return accountsWithBalances;
}

// ============================================
// FINANCIAL REPORTS
// ============================================

/**
 * Generates Trial Balance report
 * Lists all accounts with their debit/credit balances
 * Total debits should equal total credits
 * 
 * @param {number} tenantId 
 * @param {Date} asOfDate 
 */
export async function getTrialBalance(tenantId, asOfDate = new Date()) {
    const accounts = await prisma.account.findMany({
        where: { tenantId, isActive: true },
        orderBy: { code: 'asc' },
    });

    const trialBalanceLines = await Promise.all(
        accounts.map(async (account) => {
            const totals = await prisma.journalLine.aggregate({
                where: {
                    accountId: account.id,
                    journal: {
                        status: 'POSTED',
                        date: { lte: asOfDate },
                    },
                },
                _sum: {
                    debit: true,
                    credit: true,
                },
            });

            const totalDebits = Number(totals._sum.debit || 0);
            const totalCredits = Number(totals._sum.credit || 0);

            let debitBalance = 0;
            let creditBalance = 0;

            if (['ASSET', 'EXPENSE'].includes(account.type)) {
                const netBalance = totalDebits - totalCredits;
                if (netBalance >= 0) {
                    debitBalance = netBalance;
                } else {
                    creditBalance = Math.abs(netBalance);
                }
            } else {
                const netBalance = totalCredits - totalDebits;
                if (netBalance >= 0) {
                    creditBalance = netBalance;
                } else {
                    debitBalance = Math.abs(netBalance);
                }
            }

            return {
                accountId: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
                debitBalance,
                creditBalance,
            };
        })
    );

    // Filter out zero-balance accounts for cleaner report
    const activeLines = trialBalanceLines.filter(
        line => line.debitBalance !== 0 || line.creditBalance !== 0
    );

    const totalDebits = activeLines.reduce((sum, line) => sum + line.debitBalance, 0);
    const totalCredits = activeLines.reduce((sum, line) => sum + line.creditBalance, 0);

    return {
        asOfDate,
        lines: activeLines,
        totals: {
            debits: totalDebits,
            credits: totalCredits,
            isBalanced: Math.abs(totalDebits - totalCredits) < 0.01, // Allow for floating point errors
        },
    };
}

/**
 * Generates Profit & Loss (Income Statement) report
 * Shows income vs expenses for a period
 * 
 * @param {number} tenantId 
 * @param {Date} startDate 
 * @param {Date} endDate 
 */
export async function getProfitAndLoss(tenantId, startDate, endDate) {
    // Get all income accounts
    const incomeAccounts = await prisma.account.findMany({
        where: { tenantId, type: 'INCOME', isActive: true },
        orderBy: { code: 'asc' },
    });

    // Get all expense accounts
    const expenseAccounts = await prisma.account.findMany({
        where: { tenantId, type: 'EXPENSE', isActive: true },
        orderBy: { code: 'asc' },
    });

    // Calculate income totals
    const incomeLines = await Promise.all(
        incomeAccounts.map(async (account) => {
            const totals = await prisma.journalLine.aggregate({
                where: {
                    accountId: account.id,
                    journal: {
                        status: 'POSTED',
                        date: { gte: startDate, lte: endDate },
                    },
                },
                _sum: { credit: true, debit: true },
            });

            // Income: credits increase, debits decrease
            const amount = Number(totals._sum.credit || 0) - Number(totals._sum.debit || 0);

            return {
                accountId: account.id,
                code: account.code,
                name: account.name,
                amount,
            };
        })
    );

    // Calculate expense totals
    const expenseLines = await Promise.all(
        expenseAccounts.map(async (account) => {
            const totals = await prisma.journalLine.aggregate({
                where: {
                    accountId: account.id,
                    journal: {
                        status: 'POSTED',
                        date: { gte: startDate, lte: endDate },
                    },
                },
                _sum: { debit: true, credit: true },
            });

            // Expenses: debits increase, credits decrease
            const amount = Number(totals._sum.debit || 0) - Number(totals._sum.credit || 0);

            return {
                accountId: account.id,
                code: account.code,
                name: account.name,
                amount,
            };
        })
    );

    // Filter out zero amounts
    const activeIncome = incomeLines.filter(line => line.amount !== 0);
    const activeExpenses = expenseLines.filter(line => line.amount !== 0);

    const totalIncome = activeIncome.reduce((sum, line) => sum + line.amount, 0);
    const totalExpenses = activeExpenses.reduce((sum, line) => sum + line.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    return {
        period: { startDate, endDate },
        income: {
            lines: activeIncome,
            total: totalIncome,
        },
        expenses: {
            lines: activeExpenses,
            total: totalExpenses,
        },
        netIncome,
        savingsRate: totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(1) : 0,
    };
}

/**
 * Generates Cash Flow report
 * Shows changes in asset accounts over time
 * 
 * @param {number} tenantId 
 * @param {Date} startDate 
 * @param {Date} endDate 
 */
export async function getCashFlow(tenantId, startDate, endDate) {
    // Get all asset accounts (cash/bank)
    const assetAccounts = await prisma.account.findMany({
        where: {
            tenantId,
            type: 'ASSET',
            isActive: true,
            code: { in: ['1000', '1010', '1020', '1030', '1040', '1050'] }, // Cash & bank accounts
        },
        orderBy: { code: 'asc' },
    });

    const cashFlowLines = await Promise.all(
        assetAccounts.map(async (account) => {
            // Opening balance (before start date)
            const openingTotals = await prisma.journalLine.aggregate({
                where: {
                    accountId: account.id,
                    journal: {
                        status: 'POSTED',
                        date: { lt: startDate },
                    },
                },
                _sum: { debit: true, credit: true },
            });

            const openingBalance = Number(openingTotals._sum.debit || 0) - Number(openingTotals._sum.credit || 0);

            // Period activity
            const periodTotals = await prisma.journalLine.aggregate({
                where: {
                    accountId: account.id,
                    journal: {
                        status: 'POSTED',
                        date: { gte: startDate, lte: endDate },
                    },
                },
                _sum: { debit: true, credit: true },
            });

            const inflows = Number(periodTotals._sum.debit || 0);
            const outflows = Number(periodTotals._sum.credit || 0);
            const netChange = inflows - outflows;
            const closingBalance = openingBalance + netChange;

            return {
                accountId: account.id,
                code: account.code,
                name: account.name,
                openingBalance,
                inflows,
                outflows,
                netChange,
                closingBalance,
            };
        })
    );

    const totals = cashFlowLines.reduce(
        (acc, line) => ({
            openingBalance: acc.openingBalance + line.openingBalance,
            inflows: acc.inflows + line.inflows,
            outflows: acc.outflows + line.outflows,
            netChange: acc.netChange + line.netChange,
            closingBalance: acc.closingBalance + line.closingBalance,
        }),
        { openingBalance: 0, inflows: 0, outflows: 0, netChange: 0, closingBalance: 0 }
    );

    return {
        period: { startDate, endDate },
        accounts: cashFlowLines,
        totals,
    };
}

/**
 * Gets the Balance Sheet (Statement of Financial Position)
 * Assets = Liabilities + Equity
 * 
 * @param {number} tenantId 
 * @param {Date} asOfDate 
 */
export async function getBalanceSheet(tenantId, asOfDate = new Date()) {
    const accountTypes = ['ASSET', 'LIABILITY', 'EQUITY'];
    const sections = {};

    for (const type of accountTypes) {
        const accounts = await prisma.account.findMany({
            where: { tenantId, type, isActive: true },
            orderBy: { code: 'asc' },
        });

        const lines = await Promise.all(
            accounts.map(async (account) => {
                const balance = await getAccountBalance(account.id);
                return {
                    accountId: account.id,
                    code: account.code,
                    name: account.name,
                    balance,
                };
            })
        );

        const activeLines = lines.filter(line => line.balance !== 0);
        const total = activeLines.reduce((sum, line) => sum + line.balance, 0);

        sections[type.toLowerCase()] = {
            lines: activeLines,
            total,
        };
    }

    return {
        asOfDate,
        assets: sections.asset,
        liabilities: sections.liability,
        equity: sections.equity,
        // Accounting equation check
        isBalanced: Math.abs(
            sections.asset.total - sections.liability.total - sections.equity.total
        ) < 0.01,
    };
}

// Named exports for constants

export default {
    seedFamilyCoA,
    seedFamilyCategories,
    seedFamilyPaymentMethods,
    getAccountMapping,
    resolveAccountIds,
    createJournalEntry,
    voidJournalEntry,
    getAccountBalance,
    getAllAccountBalances,
    getTrialBalance,
    getProfitAndLoss,
    getCashFlow,
    getBalanceSheet,
};
