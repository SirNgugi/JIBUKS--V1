import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
    green: '#22C55E',
};

const GOAL_ICONS: Record<string, { name: any; color: string }> = {
    car:        { name: 'car-sport',  color: C.gold },
    home:       { name: 'home',       color: C.navy },
    education:  { name: 'school',     color: '#8B5CF6' },
    travel:     { name: 'airplane',   color: '#06B6D4' },
    business:   { name: 'briefcase',  color: '#10B981' },
    emergency:  { name: 'medkit',     color: '#EF4444' },
    default:    { name: 'flag',       color: C.navy },
};

function ProgressRing({ pct, size = 120, icon, iconColor }: { pct: number; size?: number; icon: any; iconColor: string }) {
    const filled = Math.min(pct, 100) / 100;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                position: 'absolute', width: size, height: size, borderRadius: size / 2,
                borderWidth: 7, borderColor: '#E5E7EB',
            }} />
            <View style={{
                position: 'absolute', width: size, height: size, borderRadius: size / 2,
                borderWidth: 7, borderColor: C.green,
                borderRightColor: 'transparent',
                borderBottomColor: filled > 0.5 ? C.green : 'transparent',
                transform: [{ rotate: `${-90 + filled * 360}deg` }],
                opacity: filled > 0 ? 1 : 0,
            }} />
            <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Ionicons name={icon} size={36} color={iconColor} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>{Math.round(pct)}%</Text>
            </View>
        </View>
    );
}

export default function GoalDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const goalId = params.goalId as string;

    const [goal, setGoal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (goalId) loadGoal();
    }, [goalId]);

    const loadGoal = async () => {
        try {
            setLoading(true);
            const data = await apiService.getGoal(Number(goalId));
            setGoal(data);
        } catch (e) {
            console.error('Failed to load goal:', e);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null || isNaN(Number(amount))) return 'KES 0';
        return `KES ${Number(amount).toLocaleString()}`;
    };

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return dateStr; }
    };

    const handleTopUp = () => {
        router.push({ pathname: '/add-to-goal', params: { goalId } } as any);
    };

    const handleWithdraw = () => {
        Alert.alert('Withdraw', 'Withdrawal requests are processed by the group admin. Contact your family admin to proceed.');
    };

    const handleInvite = () => {
        Alert.alert('Invite', 'Invite members to contribute to this goal from the Manage Contributors section.');
    };

    const handleEditGoal = () => {
        router.push({ pathname: '/add-saving-goals', params: { goalId, editMode: 'true' } } as any);
    };

    const handleManageContributors = () => {
        router.push({ pathname: '/contribute-group' } as any);
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
                            <Text style={s.headerTitle}>Goal</Text>
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

    if (!goal) return null;

    const progress = goal.targetAmount > 0
        ? Math.min((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100, 100)
        : 0;
    const remaining = Math.max(Number(goal.targetAmount) - Number(goal.currentAmount), 0);
    const catKey = (goal.category || '').toLowerCase();
    const catIcon = GOAL_ICONS[catKey] || GOAL_ICONS.default;
    const contributors: any[] = goal.contributors || goal.members || [];

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
                        <Text style={s.headerTitle}>{goal.name}</Text>
                        <View style={{ width: 36 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

                {/* ── PROGRESS RING ── */}
                <View style={s.ringWrap}>
                    <ProgressRing pct={progress} size={130} icon={catIcon.name} iconColor={catIcon.color} />
                </View>

                {/* ── ACTION PILLS ── */}
                <View style={s.pillRow}>
                    <TouchableOpacity style={s.pill} onPress={handleTopUp} activeOpacity={0.8}>
                        <Text style={s.pillTxt}>Top Up</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.pill} onPress={handleWithdraw} activeOpacity={0.8}>
                        <Text style={s.pillTxt}>Withdraw</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.pill} onPress={handleInvite} activeOpacity={0.8}>
                        <Text style={s.pillTxt}>Invite</Text>
                    </TouchableOpacity>
                </View>

                {/* ── TARGET DATE ── */}
                <View style={s.targetCard}>
                    <Text style={s.targetTxt}>Target: {formatDate(goal.targetDate)}</Text>
                </View>

                {/* ── CONTRIBUTED / REMAINING ── */}
                <View style={s.statsRow}>
                    <View style={s.statBox}>
                        <Text style={s.statLabel}>CONTRIBUTED</Text>
                        <Text style={[s.statValue, { color: C.green }]}>{formatCurrency(Number(goal.currentAmount))}</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statBox}>
                        <Text style={s.statLabel}>REMAINING</Text>
                        <Text style={s.statValue}>{formatCurrency(remaining)}</Text>
                    </View>
                </View>

                {/* ── CONTRIBUTORS ── */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Contributors</Text>
                    {contributors.length === 0 ? (
                        <Text style={s.noContrib}>No contributors yet.</Text>
                    ) : (
                        contributors.map((c: any, i: number) => (
                            <View key={c.id || i} style={s.contribRow}>
                                <View style={s.avatar}>
                                    <Text style={s.avatarTxt}>{(c.name || c.userName || 'U')[0].toUpperCase()}</Text>
                                </View>
                                <Text style={s.contribName}>{c.name || c.userName}</Text>
                                <Text style={s.contribAmt}>{formatCurrency(c.amount || c.contributed || 0)}</Text>
                            </View>
                        ))
                    )}
                </View>

                {/* ── GOAL SETTINGS ── */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Goal Settings</Text>
                    <View style={s.settingsCard}>
                        <TouchableOpacity style={s.settingRow} onPress={handleEditGoal} activeOpacity={0.7}>
                            <Text style={s.settingLabel}>Edit Goal</Text>
                            <Ionicons name="chevron-forward" size={18} color={C.sub} />
                        </TouchableOpacity>
                        <View style={s.settingDivider} />
                        <TouchableOpacity style={s.settingRow} onPress={handleManageContributors} activeOpacity={0.7}>
                            <Text style={s.settingLabel}>Manage Contributors</Text>
                            <Ionicons name="chevron-forward" size={18} color={C.sub} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { paddingBottom: 18, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 17, fontWeight: '800' },
    scroll: { paddingHorizontal: 18 },
    ringWrap: { alignItems: 'center', paddingVertical: 24 },
    pillRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 18 },
    pill: { paddingHorizontal: 22, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: C.navy },
    pillTxt: { fontSize: 13, fontWeight: '700', color: C.navy },
    targetCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    targetTxt: { fontSize: 14, fontWeight: '600', color: C.text },
    statsRow: { backgroundColor: C.white, borderRadius: 14, flexDirection: 'row', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1, overflow: 'hidden' },
    statBox: { flex: 1, padding: 18, alignItems: 'center' },
    statLabel: { fontSize: 11, fontWeight: '600', color: C.sub, letterSpacing: 0.5, marginBottom: 6 },
    statValue: { fontSize: 20, fontWeight: '800', color: C.text },
    statDivider: { width: 1, backgroundColor: C.border, marginVertical: 12 },
    section: { marginBottom: 14 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 10 },
    noContrib: { fontSize: 14, color: C.sub, textAlign: 'center', paddingVertical: 12 },
    contribRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 6, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { color: C.white, fontWeight: '700', fontSize: 16 },
    contribName: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
    contribAmt: { fontSize: 14, fontWeight: '700', color: C.sub },
    settingsCard: { backgroundColor: C.white, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
    settingLabel: { fontSize: 15, color: C.text },
    settingDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 18 },
});
