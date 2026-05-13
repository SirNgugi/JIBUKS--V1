import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '@/services/api';

const C = {
    navy: '#1a3a8f', navyDark: '#0e2470', gold: '#F59E0B',
    bg: '#F5F7FA', white: '#ffffff', text: '#1F2937',
    sub: '#6B7280', border: '#E5E7EB', red: '#EF4444', orange: '#F97316',
};

export default function BudgetAlertsScreen() {
    const router = useRouter();
    const [budgets, setBudgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadAlerts = async () => {
        try {
            const data = await apiService.getFamilyBudgets();
            setBudgets(data || []);
        } catch (e) {
            console.error('Failed to load budget alerts:', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { loadAlerts(); }, []));

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAlerts();
        setRefreshing(false);
    };

    const exceededBudgets = budgets.filter(b => Number(b.spent) > Number(b.limit));
    const nearLimitBudgets = budgets.filter(b => {
        const pct = Number(b.limit) > 0 ? (Number(b.spent) / Number(b.limit)) * 100 : 0;
        return pct >= 80 && pct < 100;
    });
    const alerts = [
        ...exceededBudgets.map(b => ({ ...b, alertType: 'exceeded' })),
        ...nearLimitBudgets.map(b => ({ ...b, alertType: 'near' })),
    ];

    const fmt = (n: number) => `KES ${Number(n).toLocaleString()}`;

    if (loading) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                    <SafeAreaView>
                        <View style={s.headerRow}>
                            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                                <Ionicons name="arrow-back" size={20} color={C.gold} />
                            </TouchableOpacity>
                            <Text style={s.headerTitle}>ALERTs</Text>
                            <View style={{ width: 36 }} />
                        </View>
                    </SafeAreaView>
                </LinearGradient>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={C.navy} />
                </View>
            </View>
        );
    }

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* HEADER */}
            <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={20} color={C.gold} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>ALERTs</Text>
                        <View style={{ width: 36 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
            >
                {alerts.length === 0 && (
                    <View style={s.emptyState}>
                        <Ionicons name="checkmark-circle" size={56} color="#22C55E" />
                        <Text style={s.emptyTitle}>All on track!</Text>
                        <Text style={s.emptySub}>No budget alerts at the moment.</Text>
                    </View>
                )}

                {alerts.map((b) => {
                    const spent = Number(b.spent);
                    const limit = Number(b.limit);
                    const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                    const overBy = spent - limit;
                    const isExceeded = b.alertType === 'exceeded';
                    const borderColor = isExceeded ? C.red : C.orange;
                    const barColor = isExceeded ? C.red : C.orange;

                    return (
                        <View key={b.id} style={[s.alertCard, { borderLeftColor: borderColor }]}>
                            <View style={s.alertTop}>
                                <View style={[s.alertIconCircle, { backgroundColor: isExceeded ? '#FEE2E2' : '#FFF7ED' }]}>
                                    <Ionicons name="warning" size={20} color={borderColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.alertTitle}>
                                        {b.label} Budget {isExceeded ? 'Exceeded' : 'Near Limit'}
                                    </Text>
                                    <Text style={s.alertMeta}>
                                        Budget: {fmt(limit)} | Spent:{' '}
                                        <Text style={{ color: borderColor, fontWeight: '700' }}>{fmt(spent)}</Text>
                                    </Text>
                                    {isExceeded
                                        ? <Text style={[s.alertBadge, { color: C.red }]}>OVER BY: {fmt(overBy)}</Text>
                                        : <Text style={[s.alertBadge, { color: C.orange }]}>{Math.round(pct)}% USED</Text>
                                    }
                                </View>
                            </View>
                            <View style={s.alertProgressBg}>
                                <View style={[s.alertProgressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                            </View>
                            <TouchableOpacity style={s.viewCatBtn}
                                onPress={() => router.push({ pathname: '/edit-budget', params: { budgetId: b.id.toString() } } as any)}
                                activeOpacity={0.8}>
                                <Text style={s.viewCatTxt}>View Category</Text>
                                <Ionicons name="chevron-forward" size={14} color={C.navy} />
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* TIP CARD */}
                <View style={s.tipCard}>
                    <Ionicons name="bulb" size={20} color={C.navy} />
                    <View style={{ flex: 1 }}>
                        <Text style={s.tipTitle}>Budgeting Tip</Text>
                        <Text style={s.tipBody}>
                            Consider moving funds from categories with a surplus to cover exceeded budgets this month.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
    scroll: { padding: 16 },
    alertCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
    alertTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
    alertIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    alertTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
    alertMeta: { fontSize: 12, color: C.sub },
    alertBadge: { fontSize: 11, fontWeight: '800', marginTop: 4, letterSpacing: 0.3 },
    alertProgressBg: { height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
    alertProgressFill: { height: '100%', borderRadius: 3 },
    viewCatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    viewCatTxt: { fontSize: 13, fontWeight: '700', color: C.navy },
    tipCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 4 },
    tipTitle: { fontSize: 14, fontWeight: '700', color: C.navy, marginBottom: 4 },
    tipBody: { fontSize: 13, color: C.sub, lineHeight: 19 },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 14 },
    emptySub: { fontSize: 14, color: C.sub, marginTop: 6 },
});
