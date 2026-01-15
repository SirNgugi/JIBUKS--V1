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

export default function InvoicesScreen() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('ALL'); // ALL, UNPAID, PAID

    useEffect(() => {
        loadInvoices();
    }, [filter]);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const data = await apiService.getInvoices(
                filter !== 'ALL' ? { status: filter } : undefined
            );
            setInvoices(data);
        } catch (error) {
            console.error('Error loading invoices:', error);
            Alert.alert('Error', 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadInvoices();
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID':
                return '#10b981';
            case 'PARTIAL':
                return '#f59e0b';
            case 'UNPAID':
                return '#ef4444';
            case 'DRAFT':
                return '#6b7280';
            case 'CANCELLED':
                return '#9ca3af';
            case 'OVERDUE':
                return '#dc2626';
            default:
                return '#6b7280';
        }
    };

    const handleInvoicePress = (invoice: any) => {
        router.push(`/invoice-detail?id=${invoice.id}` as any);
    };

    const handleNewInvoice = () => {
        router.push('/create-invoice' as any);
    };

    const calculateSummary = () => {
        const total = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
        const paid = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
        const outstanding = total - paid;

        return { total, paid, outstanding };
    };

    const summary = calculateSummary();

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Invoices</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>Loading invoices...</Text>
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
                <Text style={styles.headerTitle}>Invoices</Text>
                <TouchableOpacity onPress={handleNewInvoice} style={styles.addButton}>
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
                        <Text style={styles.summaryLabel}>Total Sales</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(summary.total)}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Received</Text>
                        <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                            {formatCurrency(summary.paid)}
                        </Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Outstanding</Text>
                        <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                            {formatCurrency(summary.outstanding)}
                        </Text>
                    </View>
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
                        style={[styles.filterTab, filter === 'UNPAID' && styles.filterTabActive]}
                        onPress={() => setFilter('UNPAID')}
                    >
                        <Text style={[styles.filterText, filter === 'UNPAID' && styles.filterTextActive]}>
                            Unpaid
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === 'PAID' && styles.filterTabActive]}
                        onPress={() => setFilter('PAID')}
                    >
                        <Text style={[styles.filterText, filter === 'PAID' && styles.filterTextActive]}>
                            Paid
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Invoices List */}
                <View style={styles.listContainer}>
                    {invoices.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
                            <Text style={styles.emptyText}>No invoices found</Text>
                            <Text style={styles.emptySubtext}>
                                Tap the + button to create your first invoice
                            </Text>
                        </View>
                    ) : (
                        invoices.map((invoice) => (
                            <TouchableOpacity
                                key={invoice.id}
                                style={styles.invoiceCard}
                                onPress={() => handleInvoicePress(invoice)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.invoiceHeader}>
                                    <View style={styles.invoiceLeft}>
                                        <View style={styles.iconCircle}>
                                            <Ionicons name="document-text" size={20} color="#10b981" />
                                        </View>
                                        <View>
                                            <Text style={styles.customerName}>
                                                {invoice.customer?.name || 'No Customer'}
                                            </Text>
                                            <Text style={styles.invoiceNumber}>
                                                {invoice.invoiceNumber || `Invoice #${invoice.id}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: `${getStatusColor(invoice.status)}20` },
                                        ]}
                                    >
                                        <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                                            {invoice.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.invoiceDetails}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Date:</Text>
                                        <Text style={styles.detailValue}>
                                            {formatDate(invoice.invoiceDate)}
                                        </Text>
                                    </View>
                                    {invoice.dueDate && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Due:</Text>
                                            <Text style={styles.detailValue}>{formatDate(invoice.dueDate)}</Text>
                                        </View>
                                    )}
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Total:</Text>
                                        <Text style={styles.totalAmount}>{formatCurrency(invoice.total)}</Text>
                                    </View>
                                    {invoice.status !== 'PAID' && invoice.balance > 0 && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Balance:</Text>
                                            <Text style={[styles.totalAmount, { color: '#ef4444' }]}>
                                                {formatCurrency(invoice.balance)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.invoiceFooter}>
                                    <Text style={styles.itemCount}>
                                        {invoice.items?.length || 0} item(s)
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
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
        backgroundColor: '#10b981',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 8,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    filterTabActive: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    filterTextActive: {
        color: '#fff',
    },
    listContainer: {
        paddingHorizontal: 16,
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
    invoiceCard: {
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
    invoiceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    invoiceLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    invoiceNumber: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    invoiceDetails: {
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    detailValue: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
    },
    totalAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#10b981',
    },
    invoiceFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
    },
    itemCount: {
        fontSize: 12,
        color: '#6b7280',
    },
});
