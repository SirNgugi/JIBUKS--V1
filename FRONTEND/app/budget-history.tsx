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
    sub: '#6B7280', border: '#E5E7EB',
};

// ── Simple polyline chart using Views ──────────────────────────
const CHART_W = 280;
const CHART_H = 90;

// Data points: [Aug, Sep, Oct, Nov] – normalised 0..1 (higher = more spending)
const POINTS = [
    { label: 'AUG', v: 0.25 },
    { label: 'SEP', v: 0.45 },
    { label: 'OCT', v: 0.85 },
    { label: 'NOV', v: 0.60 },
];

function TrendChart() {
    const n = POINTS.length;
    const xs = POINTS.map((_, i) => (i / (n - 1)) * CHART_W);
    const ys = POINTS.map(p => CHART_H - p.v * CHART_H);

    const segments: { x: number; y: number; len: number; angle: number }[] = [];
    for (let i = 0; i < n - 1; i++) {
        const dx = xs[i + 1] - xs[i];
        const dy = ys[i + 1] - ys[i];
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        segments.push({ x: xs[i], y: ys[i], len, angle });
    }

    return (
        <View style={{ width: CHART_W, height: CHART_H, position: 'relative', marginBottom: 8 }}>
            {/* line segments */}
            {segments.map((seg, i) => (
                <View key={i} style={{
                    position: 'absolute',
                    left: seg.x,
                    top: seg.y,
                    width: seg.len,
                    height: 2.5,
                    backgroundColor: C.gold,
                    borderRadius: 2,
                    transformOrigin: 'left center',
                    transform: [{ rotate: `${seg.angle}deg` }],
                }} />
            ))}
            {/* dots */}
            {POINTS.map((p, i) => (
                <View key={i} style={{
                    position: 'absolute',
                    left: xs[i] - 5,
                    top: ys[i] - 5,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: C.gold,
                    borderWidth: 2,
                    borderColor: C.white,
                }} />
            ))}
        </View>
    );
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_HISTORY = [
    { label: 'Food & Dining', pct: 60, note: 'High spending this month',  color: C.gold },
    { label: 'Transport',     pct: 45, note: 'Below average spending',     color: C.navy },
    { label: 'Housing',       pct: 100, note: 'Budget fully utilized',     color: '#8B5CF6' },
];

export default function BudgetHistoryScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [totalSpend] = useState(60000);
    const [trendPct] = useState(-15);

    const now = new Date();
    const trendLabel = `${MONTH_NAMES[Math.max(now.getMonth() - 3, 0)]} – ${MONTH_NAMES[now.getMonth()]} – Family Account`;

    const onRefresh = async () => {
        setRefreshing(true);
        await new Promise(res => setTimeout(res, 600));
        setRefreshing(false);
    };

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
                        <Text style={s.headerTitle}>BUDGET HISTORY</Text>
                        <View style={{ width: 36 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
            >
                {/* SPENDING TREND CARD */}
                <View style={s.trendCard}>
                    <View style={s.trendTop}>
                        <Text style={s.trendLabel}>SPENDING TREND</Text>
                        <View style={[s.trendBadge, { backgroundColor: trendPct < 0 ? '#DCFCE7' : '#FEE2E2' }]}>
                            <Text style={[s.trendBadgeTxt, { color: trendPct < 0 ? '#166534' : '#991B1B' }]}>
                                {trendPct > 0 ? '+' : ''}{trendPct}%
                            </Text>
                        </View>
                    </View>
                    <Text style={s.trendAmount}>{totalSpend.toLocaleString()}</Text>
                    <Text style={s.trendSub}>{trendLabel}</Text>

                    {/* Chart */}
                    <View style={s.chartContainer}>
                        <TrendChart />
                        {/* X axis labels */}
                        <View style={s.xAxis}>
                            {POINTS.map((p) => (
                                <Text key={p.label} style={s.xAxisLabel}>{p.label}</Text>
                            ))}
                        </View>
                    </View>
                </View>

                {/* CATEGORY HISTORY */}
                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Category History</Text>
                    <TouchableOpacity onPress={() => router.push('/budget-categories' as any)}>
                        <Text style={s.viewAll}>View All</Text>
                    </TouchableOpacity>
                </View>

                <View style={s.catList}>
                    {CATEGORY_HISTORY.map((cat) => (
                        <View key={cat.label} style={s.catCard}>
                            <View style={s.catRow}>
                                <View style={[s.catDot, { backgroundColor: cat.color + '20' }]}>
                                    <View style={[s.catDotInner, { backgroundColor: cat.color }]} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={s.catNameRow}>
                                        <Text style={s.catName}>{cat.label}</Text>
                                        <Text style={s.catPct}>{cat.pct}%</Text>
                                    </View>
                                    <Text style={s.catNote}>{cat.note}</Text>
                                    <View style={s.catProgressBg}>
                                        <View style={[s.catProgressFill, { width: `${cat.pct}%` as any, backgroundColor: cat.color }]} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* FOOTER */}
                <View style={s.footer}>
                    <Text style={s.footerTxt}>Powered by </Text>
                    <Text style={s.footerBrand}>Apbc 🌍</Text>
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
    headerTitle: { color: C.gold, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    scroll: { padding: 16 },
    trendCard: { backgroundColor: C.white, borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3 },
    trendTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    trendLabel: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.5 },
    trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    trendBadgeTxt: { fontSize: 12, fontWeight: '700' },
    trendAmount: { fontSize: 42, fontWeight: '900', color: C.text, letterSpacing: -1, marginBottom: 2 },
    trendSub: { fontSize: 12, color: C.sub, marginBottom: 16 },
    chartContainer: { alignItems: 'center' },
    xAxis: { flexDirection: 'row', justifyContent: 'space-between', width: CHART_W, marginTop: 6 },
    xAxisLabel: { fontSize: 10, color: C.sub, fontWeight: '600', flex: 1, textAlign: 'center' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: C.text },
    viewAll: { fontSize: 13, color: C.navy, fontWeight: '700' },
    catList: { gap: 4 },
    catCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    catRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    catDot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    catDotInner: { width: 14, height: 14, borderRadius: 7 },
    catNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    catName: { fontSize: 15, fontWeight: '700', color: C.text },
    catPct: { fontSize: 15, fontWeight: '800', color: C.text },
    catNote: { fontSize: 12, color: C.sub, marginBottom: 8 },
    catProgressBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
    catProgressFill: { height: '100%', borderRadius: 3 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerTxt: { fontSize: 12, color: C.sub },
    footerBrand: { fontSize: 12, fontWeight: '700', color: C.navy },
});
