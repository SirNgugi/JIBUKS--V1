import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '@/services/api';

export default function WriteChequeScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);

    // Form state
    const [bankAccountId, setBankAccountId] = useState('');
    const [payee, setPayee] = useState('');
    const [amount, setAmount] = useState('');
    const [chequeNumber, setChequeNumber] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expenseAccountId, setExpenseAccountId] = useState('');
    const [memo, setMemo] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [vendorsData, accountsData] = await Promise.all([
                apiService.getVendors(),
                apiService.getAccounts()
            ]);
            setVendors(vendorsData);

            // Filter for bank accounts (ASSET type, typically)
            const banks = accountsData.filter((a: any) =>
                a.type === 'ASSET' && (a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('cash'))
            );
            setBankAccounts(banks);

            // Filter for expense accounts
            const expenses = accountsData.filter((a: any) => a.type === 'EXPENSE');
            setAccounts(expenses);
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load data');
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!bankAccountId) {
            Alert.alert('Error', 'Please select a bank account');
            return;
        }

        if (!payee) {
            Alert.alert('Error', 'Please enter payee name');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (!expenseAccountId) {
            Alert.alert('Error', 'Please select an expense account');
            return;
        }

        try {
            setLoading(true);

            const chequeData = {
                bankAccountId: parseInt(bankAccountId),
                payee,
                amount: parseFloat(amount),
                chequeNumber: chequeNumber || undefined,
                date,
                expenseAccountId: parseInt(expenseAccountId),
                memo: memo || undefined,
            };

            await apiService.writeCheque(chequeData);

            Alert.alert('Success', 'Cheque written successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error writing cheque:', error);
            Alert.alert('Error', (error as any).error || 'Failed to write cheque');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Write Cheque</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Cheque Preview Card */}
                <View style={styles.chequePreview}>
                    <View style={styles.chequeHeader}>
                        <Ionicons name="card-outline" size={32} color="#2563eb" />
                        <Text style={styles.chequeTitle}>Cheque Details</Text>
                    </View>
                    <View style={styles.chequeDivider} />
                    <View style={styles.chequeBody}>
                        <Text style={styles.chequeLabel}>Pay to the order of:</Text>
                        <Text style={styles.chequeValue}>{payee || '_______________'}</Text>
                        <Text style={styles.chequeLabel}>Amount:</Text>
                        <Text style={styles.chequeAmount}>
                            KES {amount ? parseFloat(amount).toLocaleString() : '0.00'}
                        </Text>
                    </View>
                </View>

                {/* Form */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cheque Information</Text>

                    <Text style={styles.label}>Bank Account *</Text>
                    <View style={styles.pickerContainer}>
                        <Ionicons name="business-outline" size={20} color="#6b7280" />
                        <select
                            value={bankAccountId}
                            onChange={(e) => setBankAccountId(e.target.value)}
                            style={styles.picker}
                        >
                            <option value="">Select Bank Account</option>
                            {bankAccounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.name} ({account.code})
                                </option>
                            ))}
                        </select>
                    </View>

                    <Text style={styles.label}>Payee *</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#6b7280" />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter payee name"
                            value={payee}
                            onChangeText={setPayee}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Amount *</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="cash-outline" size={20} color="#6b7280" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Cheque Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="document-text-outline" size={20} color="#6b7280" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Optional"
                                    value={chequeNumber}
                                    onChangeText={setChequeNumber}
                                />
                            </View>
                        </View>
                    </View>

                    <Text style={styles.label}>Date *</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                        <TextInput
                            style={styles.input}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                        />
                    </View>

                    <Text style={styles.label}>Expense Account *</Text>
                    <View style={styles.pickerContainer}>
                        <Ionicons name="folder-outline" size={20} color="#6b7280" />
                        <select
                            value={expenseAccountId}
                            onChange={(e) => setExpenseAccountId(e.target.value)}
                            style={styles.picker}
                        >
                            <option value="">Select Expense Account</option>
                            {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.code} - {account.name}
                                </option>
                            ))}
                        </select>
                    </View>

                    <Text style={styles.label}>Memo</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Optional memo..."
                        value={memo}
                        onChangeText={setMemo}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Accounting Entry Preview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Journal Entry</Text>
                    <View style={styles.journalCard}>
                        <View style={styles.journalRow}>
                            <View style={styles.journalColumn}>
                                <Text style={styles.journalHeader}>Account</Text>
                                <Text style={styles.journalAccount}>
                                    {expenseAccountId
                                        ? accounts.find(a => a.id === parseInt(expenseAccountId))?.name || 'Expense Account'
                                        : 'Expense Account'}
                                </Text>
                                <Text style={styles.journalAccount}>
                                    {bankAccountId
                                        ? bankAccounts.find(a => a.id === parseInt(bankAccountId))?.name || 'Bank Account'
                                        : 'Bank Account'}
                                </Text>
                            </View>
                            <View style={styles.journalColumn}>
                                <Text style={styles.journalHeader}>Debit</Text>
                                <Text style={styles.journalDebit}>
                                    {amount ? parseFloat(amount).toLocaleString() : '0.00'}
                                </Text>
                                <Text style={styles.journalCredit}>-</Text>
                            </View>
                            <View style={styles.journalColumn}>
                                <Text style={styles.journalHeader}>Credit</Text>
                                <Text style={styles.journalCredit}>-</Text>
                                <Text style={styles.journalCredit}>
                                    {amount ? parseFloat(amount).toLocaleString() : '0.00'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <Text style={styles.journalNote}>
                        ℹ️ This cheque will debit your expense account and credit your bank account
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={24} color="#fff" />
                            <Text style={styles.submitButtonText}>Write Cheque</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    scrollView: {
        flex: 1,
    },
    chequePreview: {
        margin: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 2,
        borderColor: '#2563eb',
    },
    chequeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    chequeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    chequeDivider: {
        height: 2,
        backgroundColor: '#e5e7eb',
        marginVertical: 16,
    },
    chequeBody: {
        gap: 8,
    },
    chequeLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 8,
    },
    chequeValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    chequeAmount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    section: {
        padding: 16,
        backgroundColor: '#fff',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginTop: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 12,
        height: 48,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1f2937',
    },
    textArea: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 12,
        height: 48,
    },
    picker: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1f2937',
        backgroundColor: 'transparent',
    },
    row: {
        flexDirection: 'row',
    },
    journalCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    journalRow: {
        flexDirection: 'row',
        gap: 12,
    },
    journalColumn: {
        flex: 1,
    },
    journalHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 8,
    },
    journalAccount: {
        fontSize: 14,
        color: '#1f2937',
        marginBottom: 8,
    },
    journalDebit: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ef4444',
        marginBottom: 8,
    },
    journalCredit: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10b981',
        marginBottom: 8,
    },
    journalNote: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 12,
        fontStyle: 'italic',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        marginHorizontal: 16,
        marginTop: 16,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});
