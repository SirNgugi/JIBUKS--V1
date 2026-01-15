import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '@/services/api';

export default function BankingScreen() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('ALL'); // ALL, DEPOSIT, CHEQUE, TRANSFER

    useEffect(() => {
        loadTransactions();
    }, [filter]);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const data = await apiService.getBankTransactions(
                filter !== 'ALL' ? { type: filter } : undefined
            );
            setTransactions(data);
        } catch (error) {
            console.error('Error loading transactions:', error);
            Alert.alert('Error', 'Failed to load bank transactions');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTransactions();
        setRefreshing(false);
    };

    const formatCurrency = (amount: number) => {
        return `KES ${Number(amount).toLocaleString()}`;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'DEPOSIT':
                return 'arrow-down-circle';
            case 'CHEQUE':
                return 'card-outline';
            case 'TRANSFER':
                return 'swap-horizontal';
            default:
                return 'cash';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'DEPOSIT':
                return '#10b981';
            case 'CHEQUE':
                return '#ef4444';
            case 'TRANSFER':
                return '#2563eb';
            default:
                return '#6b7280';
        }
    };

    const calculateSummary = () => {
        const deposits = transactions
            .filter(t => t.type === 'DEPOSIT')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const cheques = transactions
            .filter(t => t.type === 'CHEQUE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const transfers = transactions
            .filter(t => t.type === 'TRANSFER')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        return { deposits, cheques, transfers, net: deposits - cheques };
    };

    const summary = calculateSummary();

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Banking</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading transactions...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Banking</Text>
                <TouchableOpacity
                    onPress={() => router.push('/write-cheque' as any)}
                    style={styles.addButton}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryCard}>
                        <Ionicons name="arrow-down-circle" size={24} color="#10b981" />
                        <Text style={styles.summaryLabel}>Deposits</Text>
                        <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                            {formatCurrency(summary.deposits)}
                        </Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Ionicons name="card-outline" size={24} color="#ef4444" />
                        <Text style={styles.summaryLabel}>Cheques</Text>
                        <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                            {formatCurrency(summary.cheques)}
                        </Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Ionicons name="trending-up" size={24} color="#2563eb" />
                        <Text style={styles.summaryLabel}>Net Cash Flow</Text>
                        <Text style={[
                            styles.summaryValue,
                            { color: summary.net >= 0 ? '#10b981' : '#ef4444' }
                        ]}>
                            {formatCurrency(summary.net)}
                        </Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/write-cheque' as any)}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
                            <Ionicons name="card-outline" size={24} color="#ef4444" />
                        </View>
                        <Text style={styles.actionText}>Write Cheque</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/record-deposit' as any)}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#d1fae5' }]}>
                            <Ionicons name="arrow-down-circle" size={24} color="#10b981" />
                        </View>
                        <Text style={styles.actionText}>Record Deposit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/bank-transfer' as any)}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                            <Ionicons name="swap-horizontal" size={24} color="#2563eb" />
                        </View>
                        <Text style={styles.actionText}>Transfer</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
                        onPress={() => setFilter('ALL')}
                    >
                        <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
                            All
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === 'DEPOSIT' && styles.filterTabActive]}
                        onPress={() => setFilter('DEPOSIT')}
                    >
                        <Text style={[styles.filterText, filter === 'DEPOSIT' && styles.filterTextActive]}>
                            Deposits
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === 'CHEQUE' && styles.filterTabActive]}
                        onPress={() => setFilter('CHEQUE')}
                    >
                        <Text style={[styles.filterText, filter === 'CHEQUE' && styles.filterTextActive]}>
                            Cheques
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === 'TRANSFER' && styles.filterTabActive]}
                        onPress={() => setFilter('TRANSFER')}
                    >
                        <Text style={[styles.filterText, filter === 'TRANSFER' && styles.filterTextActive]}>
                            Transfers
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Transactions List */}
                <View style={styles.listContainer}>
                    <Text style={styles.sectionTitle}>Recent Transactions</Text>

                    {transactions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="wallet-outline" size={64} color="#d1d5db" />
                            <Text style={styles.emptyText}>No transactions found</Text>
                            <Text style={styles.emptySubtext}>
                                Start by writing a cheque or recording a deposit
                            </Text>
                        </View>
                    ) : (
                        transactions.map((transaction) => (
                            <TouchableOpacity
                                key={transaction.id}
                                style={styles.transactionCard}
                                onPress={() => router.push(`/bank-transaction-detail?id=${transaction.id}` as any)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.transactionLeft}>
                                    <View style={[
                                        styles.transactionIcon,
                                        { backgroundColor: `${getTypeColor(transaction.type)}20` }
                                    ]}>
                                        <Ionicons
                                            name={getTypeIcon(transaction.type) as any}
                                            size={24}
                                            color={getTypeColor(transaction.type)}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.transactionType}>{transaction.type}</Text>
                                        <Text style={styles.transactionDescription}>
                                            {transaction.description || transaction.payee || 'No description'}
                                        </Text>
                                        <Text style={styles.transactionDate}>
                                            {formatDate(transaction.date)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.transactionRight}>
                                    <Text style={[
                                        styles.transactionAmount,
                                        {
                                            color: transaction.type === 'DEPOSIT'
                                                ? '#10b981'
                                                : transaction.type === 'CHEQUE'
                                                    ? '#ef4444'
                                                    : '#2563eb'
                                        }
                                    ]}>
                                        {transaction.type === 'DEPOSIT' ? '+' : '-'}
                                        {formatCurrency(transaction.amount)}
                                    </Text>
                                    {transaction.chequeNumber && (
                                        <Text style={styles.chequeNumber}>
                                            Cheque #{transaction.chequeNumber}
                                        </Text>
                                    )}
                                    {transaction.status && (
                                        <View style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor: transaction.status === 'CLEARED'
                                                    ? '#d1fae5'
                                                    : transaction.status === 'PENDING'
                                                        ? '#fef3c7'
                                                        : '#fee2e2'
                                            }
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                {
                                                    color: transaction.status === 'CLEARED'
                                                        ? '#10b981'
                                                        : transaction.status === 'PENDING'
                                                            ? '#f59e0b'
                                                            : '#ef4444'
                                                }
                                            ]}>
                                                {transaction.status}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View style={{ height: 100 }} />
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
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    scrollView: {
        flex: 1,
    },
    summaryContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryLabel: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 4,
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 12,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    filterTabActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
    },
    filterTextActive: {
        color: '#fff',
    },
    listContainer: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
        textAlign: 'center',
    },
    transactionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    transactionLeft: {
        flexDirection: 'row',
        flex: 1,
        marginRight: 12,
    },
    transactionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    transactionType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        textTransform: 'capitalize',
    },
    transactionDescription: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    transactionDate: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    chequeNumber: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
});
