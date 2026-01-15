import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '@/services/api';

export default function ReportsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [financialSummary, setFinancialSummary] = useState<any>(null);
    const [selectedPeriod, setSelectedPeriod] = useState('THIS_MONTH');

    useEffect(() => {
        loadData();
    }, [selectedPeriod]);

    const getPeriodDates = () => {
        const now = new Date();
        let startDate, endDate;

        switch (selectedPeriod) {
            case 'THIS_MONTH':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'LAST_MONTH':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'THIS_YEAR':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        };
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const { startDate, endDate } = getPeriodDates();
            const summary = await apiService.getFinancialSummary(startDate, endDate);
            setFinancialSummary(summary);
        } catch (error) {
            console.error('Error loading financial summary:', error);
            Alert.alert('Error', 'Failed to load financial reports');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const formatCurrency = (amount: number) => {
        return `KES ${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    const getPeriodLabel = () => {
        const labels: { [key: string]: string } = {
            THIS_MONTH: 'This Month',
            LAST_MONTH: 'Last Month',
            THIS_YEAR: 'This Year',
        };
        return labels[selectedPeriod] || 'This Month';
    };

    const periods = [
        { key: 'THIS_MONTH', label: 'This Month' },
        { key: 'LAST_MONTH', label: 'Last Month' },
        { key: 'THIS_YEAR', label: 'This Year' },
    ];

    const reportCards = [
        {
            id: 'profit-loss',
            title: 'Profit & Loss',
            subtitle: 'Income Statement',
            icon: 'trending-up',
            color: '#10b981',
            bgColor: '#d1fae5',
            route: '/reports/profit-loss',
        },
        {
            id: 'balance-sheet',
            title: 'Balance Sheet',
            subtitle: 'Financial Position',
            icon: 'analytics',
            color: '#3b82f6',
            bgColor: '#dbeafe',
            route: '/reports/balance-sheet',
        },
        {
            id: 'cash-flow',
            title: 'Cash Flow',
            subtitle: 'Money Movement',
            icon: 'water',
            color: '#8b5cf6',
            bgColor: '#ede9fe',
            route: '/reports/cash-flow',
        },
        {
            id: 'trial-balance',
            title: 'Trial Balance',
            subtitle: 'Account Verification',
            icon: 'calculator',
            color: '#f59e0b',
            bgColor: '#fef3c7',
            route: '/reports/trial-balance',
        },
        {
            id: 'category-analysis',
            title: 'Category Analysis',
            subtitle: 'Expense Breakdown',
            icon: 'pie-chart',
            color: '#ef4444',
            bgColor: '#fee2e2',
            route: '/reports/category-analysis',
        },
        {
            id: 'monthly-trend',
            title: 'Monthly Trends',
            subtitle: '6-Month Overview',
            icon: 'stats-chart',
            color: '#06b6d4',
            bgColor: '#cffafe',
            route: '/reports/monthly-trend',
        },
    ];

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Financial Reports</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </LinearGradient>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading reports...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Financial Reports</Text>
                    <TouchableOpacity onPress={onRefresh} style={styles.backButton}>
                        <Ionicons name="refresh" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerSubtitle}>Business Intelligence & Analytics</Text>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Period Selector */}
                <View style={styles.periodSection}>
                    <Text style={styles.periodLabel}>Report Period</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
                        {periods.map((period) => (
                            <TouchableOpacity
                                key={period.key}
                                style={[
                                    styles.periodChip,
                                    selectedPeriod === period.key && styles.periodChipActive,
                                ]}
                                onPress={() => setSelectedPeriod(period.key)}
                            >
                                <Text
                                    style={[
                                        styles.periodChipText,
                                        selectedPeriod === period.key && styles.periodChipTextActive,
                                    ]}
                                >
                                    {period.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Key Metrics Summary */}
                {financialSummary && (
                    <View style={styles.metricsSection}>
                        <Text style={styles.sectionTitle}>Key Metrics - {getPeriodLabel()}</Text>

                        <View style={styles.metricsGrid}>
                            {/* Total Income */}
                            <View style={styles.metricCard}>
                                <View style={[styles.metricIcon, { backgroundColor: '#d1fae5' }]}>
                                    <Ionicons name="arrow-down-circle" size={24} color="#10b981" />
                                </View>
                                <Text style={styles.metricLabel}>Total Income</Text>
                                <Text style={[styles.metricValue, { color: '#10b981' }]}>
                                    {formatCurrency(financialSummary.keyMetrics?.totalIncome || 0)}
                                </Text>
                            </View>

                            {/* Total Expenses */}
                            <View style={styles.metricCard}>
                                <View style={[styles.metricIcon, { backgroundColor: '#fee2e2' }]}>
                                    <Ionicons name="arrow-up-circle" size={24} color="#ef4444" />
                                </View>
                                <Text style={styles.metricLabel}>Total Expenses</Text>
                                <Text style={[styles.metricValue, { color: '#ef4444' }]}>
                                    {formatCurrency(financialSummary.keyMetrics?.totalExpenses || 0)}
                                </Text>
                            </View>

                            {/* Net Income */}
                            <View style={styles.metricCard}>
                                <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
                                    <Ionicons name="cash" size={24} color="#3b82f6" />
                                </View>
                                <Text style={styles.metricLabel}>Net Income</Text>
                                <Text
                                    style={[
                                        styles.metricValue,
                                        {
                                            color:
                                                (financialSummary.keyMetrics?.netIncome || 0) >= 0
                                                    ? '#10b981'
                                                    : '#ef4444',
                                        },
                                    ]}
                                >
                                    {formatCurrency(financialSummary.keyMetrics?.netIncome || 0)}
                                </Text>
                            </View>

                            {/* Savings Rate */}
                            <View style={styles.metricCard}>
                                <View style={[styles.metricIcon, { backgroundColor: '#ede9fe' }]}>
                                    <Ionicons name="trending-up" size={24} color="#8b5cf6" />
                                </View>
                                <Text style={styles.metricLabel}>Savings Rate</Text>
                                <Text style={[styles.metricValue, { color: '#8b5cf6' }]}>
                                    {formatPercentage(financialSummary.keyMetrics?.savingsRate || 0)}
                                </Text>
                            </View>

                            {/* Net Worth */}
                            <View style={styles.metricCard}>
                                <View style={[styles.metricIcon, { backgroundColor: '#fef3c7' }]}>
                                    <Ionicons name="wallet" size={24} color="#f59e0b" />
                                </View>
                                <Text style={styles.metricLabel}>Net Worth</Text>
                                <Text style={[styles.metricValue, { color: '#f59e0b' }]}>
                                    {formatCurrency(financialSummary.keyMetrics?.netWorth || 0)}
                                </Text>
                            </View>

                            {/* Total Cash */}
                            <View style={styles.metricCard}>
                                <View style={[styles.metricIcon, { backgroundColor: '#cffafe' }]}>
                                    <Ionicons name="cash-outline" size={24} color="#06b6d4" />
                                </View>
                                <Text style={styles.metricLabel}>Total Cash</Text>
                                <Text style={[styles.metricValue, { color: '#06b6d4' }]}>
                                    {formatCurrency(financialSummary.keyMetrics?.totalCash || 0)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Available Reports */}
                <View style={styles.reportsSection}>
                    <Text style={styles.sectionTitle}>Available Reports</Text>
                    <Text style={styles.sectionSubtitle}>
                        Click any report to view detailed analysis
                    </Text>

                    <View style={styles.reportsGrid}>
                        {reportCards.map((report) => (
                            <TouchableOpacity
                                key={report.id}
                                style={styles.reportCard}
                                onPress={() => router.push(report.route as any)}
                            >
                                <View style={[styles.reportIcon, { backgroundColor: report.bgColor }]}>
                                    <Ionicons name={report.icon as any} size={28} color={report.color} />
                                </View>
                                <View style={styles.reportInfo}>
                                    <Text style={styles.reportTitle}>{report.title}</Text>
                                    <Text style={styles.reportSubtitle}>{report.subtitle}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Quick Insights */}
                {financialSummary?.topExpenses && financialSummary.topExpenses.length > 0 && (
                    <View style={styles.insightsSection}>
                        <Text style={styles.sectionTitle}>Top Expenses</Text>
                        {financialSummary.topExpenses.slice(0, 5).map((expense: any, index: number) => (
                            <View key={index} style={styles.insightCard}>
                                <View style={styles.insightLeft}>
                                    <View style={styles.insightRank}>
                                        <Text style={styles.insightRankText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.insightName}>{expense.name}</Text>
                                </View>
                                <Text style={styles.insightAmount}>{formatCurrency(expense.amount)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        paddingTop: 20,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#f59e0b',
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    content: {
        flex: 1,
    },
    periodSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    periodLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 12,
    },
    periodScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    periodChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    periodChipActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    periodChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    periodChipTextActive: {
        color: '#fff',
    },
    metricsSection: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 16,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    metricCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    metricIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    metricLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    reportsSection: {
        paddingHorizontal: 20,
        marginTop: 32,
    },
    reportsGrid: {
        gap: 12,
    },
    reportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    reportIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    reportInfo: {
        flex: 1,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    reportSubtitle: {
        fontSize: 13,
        color: '#6b7280',
    },
    insightsSection: {
        paddingHorizontal: 20,
        marginTop: 32,
    },
    insightCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    insightLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    insightRank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightRankText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    insightName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        flex: 1,
    },
    insightAmount: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ef4444',
    },
});
