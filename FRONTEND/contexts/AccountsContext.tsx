import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import apiService, { Account } from '@/services/api';

interface AccountsContextValue {
  accounts: Account[];
  defaultAccount: Account | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AccountsContext = createContext<AccountsContextValue | undefined>(undefined);

export const AccountsProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch accounts with balances from backend
      const data = await apiService.listAccounts({ includeBalances: true });
      setAccounts(data || []);
    } catch (err: any) {
      console.error('Error loading accounts:', err);
      setError(err?.message || 'Failed to load accounts');
      setAccounts([]); // Empty accounts on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const value = useMemo<AccountsContextValue>(
    () => ({
      accounts,
      defaultAccount: accounts.find(a => a.isDefault) || accounts[0] || null,
      loading,
      error,
      refresh: loadAccounts,
    }),
    [accounts, loading, error]
  );

  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>;
};

export const useAccounts = () => {
  const ctx = useContext(AccountsContext);
  if (!ctx) {
    throw new Error('useAccounts must be used within an AccountsProvider');
  }
  return ctx;
};

export default AccountsContext;
