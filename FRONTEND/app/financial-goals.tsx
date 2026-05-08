import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '@/services/api';

const C = {
    navy: '#1a3a8f',
    navyDark: '#0e2470',
    gold: '#F59E0B',
    bg: '#F5F7FA',
    white: '#ffffff',
    text: '#1F2937',
    sub: '#6B7280',
    border: '#E5E7EB',
};

const GOAL_ICONS: Record<string, any> = {
    car:        { name: 'car-sport', color: C.gold },
    home:       { name: 'home',      color: C.navy },
    education:  { name: 'school',    color: '#8B5CF6' },
    travel:     { name: 'airplane',  color: '#06B6D4' },
    business:   { name: 'briefcase', color: '#10B981' },
    emergency:  { name: 'medkit',    color: '#EF4444' },
    default:    { name: 'flag',      color: C.navy },
};

function GoalIcon({ category, size = 30 }: { category?: string; size?: number }) {
    const key = (category || '').toLowerCase();
    const icon = GOAL_ICONS[key] || GOAL_ICONS.default;
    return (
        <View style={{
            width: size + 20, height: size + 20, borderRadius: (size + 20) / 2,
            backgroundColor: icon.color + '20', borderWidth: 2.5, borderColor: icon.color,
            alignItems: 'center', justifyContent: 'center',
        }}>
            <Ionicons name={icon.name} size={size} color={icon.color} />
        </View>
    );
}

export default function FinancialGoalsScreen() {
    const router = useRouter();
    const [goals, setGoals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { loadGoals(); }, []);

    const loadGoals = async () => {
        try {
            setLoading(true);
            const data = await apiService.getGoals();
            setGoals(data || []);
        } catch (e) {
            console.error('Failed to load goals:', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadGoals();
        setRefreshing(false);
    };

    const calculateProgress = (current: number, target: number) => {
        if (!target || target === 0) return 0;
        return Math.min((current / target) * 100, 100);
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null || isNaN(Number(amount))) return 'KES 0';
        return `KES ${Number(amount).toLocaleString()}`;
    };

    const totalSaved = goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);

    const handleTopUp = (goal: any) => {
        router.push({ pathname: '/add-to-goal', params: { goalId: goal.id.toString() } } as any);
    };

    const handleGoalDetail = (goal: any) => {
        router.push({ pathname: '/goal-detail', params: { goalId: goal.id.toString() } } as any);
    };

    const handleCreateGoal = () => {
        router.push('/add-saving-goals' as any);
    };

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
                            <Text style={s.headerTitle}>GOALS</Text>
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

            {/* ── HEADER ── */}
            <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={20} color={C.gold} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>GOALS</Text>
                        <View style={{ width: 36 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
            >
                {/* ── TOTAL SAVED CARD ── */}
                <View style={s.totalCard}>
                    <Text style={s.totalLabel}>TOTAL SAVED</Text>
                    <Text style={s.totalAmount}>{formatCurrency(totalSaved)}</Text>
                    <View style={s.monthBadge}>
                        <Ionicons name="trending-up" size={13} color={C.white} />
                        <Text style={s.monthBadgeText}>+12.5% THIS MONTH</Text>
                    </View>
                </View>

                {/* ── ACTIVE GOALS HEADER ── */}
                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Active Goals</Text>
                    <Text style={s.sectionSub}>TRACKING YOUR PROGRESS</Text>
                </View>

                {/* ── GOALS GRID ── */}
                {goals.length === 0 ? (
                    <View style={s.emptyWrap}>
                        <Ionicons name="trophy-outline" size={64} color="#CBD5E1" />
                        <Text style={s.emptyTitle}>No Goals Yet</Text>
                        <Text style={s.emptyText}>Create your first savings goal to get started!</Text>
                    </View>
                ) : (
                    <View style={s.grid}>
                        {goals.map((goal) => {
                            const progress = calculateProgress(Number(goal.currentAmount) || 0, Number(goal.targetAmount));
                            return (
                                <TouchableOpacity key={goal.id} style={s.goalCard} onPress={() => handleGoalDetail(goal)} activeOpacity={0.85}>
                                    <GoalIcon category={goal.category} size={28} />
                                    <Text style={s.goalName} numberOfLines={2}>{goal.name}</Text>
                                    {goal.targetDate && (
                                        <Text style={s.goalDue}>
                                            DUE {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
                                        </Text>
                                    )}
                                    <Text style={s.goalCurrent}>{formatCurrency(Number(goal.currentAmount) || 0)}</Text>
                                    <Text style={s.goalTarget}>TARGET {formatCurrency(Number(goal.targetAmount))}</Text>
                                    <View style={s.miniProgress}>
                                        <View style={[s.miniProgressFill, { width: `${progress}%` as any }]} />
                                    </View>
                                    <TouchableOpacity style={s.topUpBtn} onPress={() => handleTopUp(goal)}>
                                        <Text style={s.topUpTxt}>TOP UP</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* ── CREATE NEW GOAL ── */}
                <TouchableOpacity style={s.createCard} onPress={handleCreateGoal} activeOpacity={0.8}>
                    <View style={s.createIcon}>
                        <Ionicons name="add" size={22} color={C.navy} />
                    </View>
                    <Text style={s.createTxt}>Create New Savings Goal</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── FAB ── */}
            <TouchableOpacity style={s.fab} onPress={handleCreateGoal} activeOpacity={0.85}>
                <Ionicons name="add" size={28} color={C.white} />
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { paddingBottom: 18, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
    scroll: { padding: 16 },
    totalCard: { backgroundColor: C.white, borderRadius: 18, padding: 22, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3 },
    totalLabel: { fontSize: 11, fontWeight: '600', color: C.sub, letterSpacing: 0.5, marginBottom: 6 },
    totalAmount: { fontSize: 32, fontWeight: '800', color: C.navy, marginBottom: 12 },
    monthBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.navy, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
    monthBadgeText: { color: C.white, fontSize: 11, fontWeight: '700' },
    sectionHeader: { marginBottom: 14 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: C.text },
    sectionSub: { fontSize: 11, color: C.sub, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    goalCard: { width: '47%', backgroundColor: C.white, borderRadius: 18, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
    goalName: { fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'center', marginTop: 10, marginBottom: 4 },
    goalDue: { fontSize: 10, color: C.sub, fontWeight: '600', marginBottom: 6 },
    goalCurrent: { fontSize: 15, fontWeight: '800', color: C.navy, marginBottom: 2 },
    goalTarget: { fontSize: 10, color: C.sub, fontWeight: '600', marginBottom: 8 },
    miniProgress: { width: '100%', height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
    miniProgressFill: { height: '100%', backgroundColor: C.gold, borderRadius: 2 },
    topUpBtn: { backgroundColor: C.gold, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7, width: '100%', alignItems: 'center' },
    topUpTxt: { color: C.white, fontSize: 12, fontWeight: '800' },
    emptyWrap: { alignItems: 'center', paddingVertical: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 16, marginBottom: 8 },
    emptyText: { fontSize: 14, color: C.sub, textAlign: 'center' },
    createCard: { backgroundColor: C.white, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 6, elevation: 1 },
    createIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: C.navy, alignItems: 'center', justifyContent: 'center' },
    createTxt: { fontSize: 15, fontWeight: '600', color: C.navy },
    fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', shadowColor: C.gold, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6 },
});
