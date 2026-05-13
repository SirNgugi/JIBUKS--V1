import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, ActivityIndicator, RefreshControl, Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '@/services/api';

const C = {
    navy: '#1a3a8f', navyDark: '#0e2470', gold: '#F59E0B',
    bg: '#F5F7FA', white: '#ffffff', text: '#1F2937',
    sub: '#6B7280', border: '#E5E7EB', green: '#22C55E',
};

// ── Circular progress ring (View-based, no SVG needed) ──────────────────────
function ProgressRing({ pct, color, size = 68, thickness = 7 }: { pct: number; color: string; size?: number; thickness?: number }) {
    const p = Math.min(Math.max(pct, 0), 100);
    const half = size / 2;
    const rightAngle = Math.min(p, 50) / 50 * 180;
    const leftAngle  = p > 50 ? (p - 50) / 50 * 180 : 0;

    return (
        <View style={{ width: size, height: size }}>
            {/* BG ring */}
            <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, borderWidth: thickness, borderColor: '#E8ECF0' }} />
            {/* Right half fill */}
            <View style={{ position: 'absolute', width: half, height: size, right: 0, overflow: 'hidden' }}>
                <View style={{
                    width: size, height: size, borderRadius: half,
                    borderWidth: thickness, borderColor: 'transparent',
                    borderRightColor: color, borderTopColor: rightAngle > 90 ? color : 'transparent',
                    position: 'absolute', right: 0,
                    transform: [{ rotate: `${rightAngle - 180}deg` }],
                }} />
            </View>
            {/* Left half fill (>50%) */}
            {p > 50 && (
                <View style={{ position: 'absolute', width: half, height: size, left: 0, overflow: 'hidden' }}>
                    <View style={{
                        width: size, height: size, borderRadius: half,
                        borderWidth: thickness, borderColor: 'transparent',
                        borderLeftColor: color, borderBottomColor: leftAngle > 90 ? color : 'transparent',
                        position: 'absolute', left: 0,
                        transform: [{ rotate: `${leftAngle}deg` }],
                    }} />
                </View>
            )}
            {/* Inner mask */}
            <View style={{ position: 'absolute', margin: thickness, width: size - thickness * 2, height: size - thickness * 2, borderRadius: half - thickness, backgroundColor: C.white }} />
            {/* Center % */}
            <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: size * 0.22, fontWeight: '800', color }}>{p}%</Text>
            </View>
        </View>
    );
}

// ── Avatar pile ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#EDE9FE'];
function AvatarPile({ members, total }: { members: any[]; total: number }) {
    const shown = members.slice(0, 3);
    const extra = total - shown.length;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {shown.map((m, i) => (
                <View key={m.id} style={[ap.avatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length], marginLeft: i > 0 ? -8 : 0, zIndex: shown.length - i }]}>
                    <Text style={ap.avatarTxt}>{(m.name || 'U')[0].toUpperCase()}</Text>
                </View>
            ))}
            {extra > 0 && (
                <View style={[ap.avatar, { backgroundColor: '#E5E7EB', marginLeft: -8 }]}>
                    <Text style={[ap.avatarTxt, { color: C.sub }]}>+{extra}</Text>
                </View>
            )}
        </View>
    );
}
const ap = StyleSheet.create({
    avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white },
    avatarTxt: { fontSize: 11, fontWeight: '800', color: C.navy },
});

export default function GroupsScreen() {
    const router = useRouter();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            const data = await apiService.getFamilyGroups();
            setGroups(data || []);
        } catch (e) { console.error('Failed to load groups:', e); }
        finally { setLoading(false); }
    };

    useFocusEffect(useCallback(() => { load(); }, []));

    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const totalSaved = groups.reduce((s, g) => s + Number(g.saved), 0);
    const fmt = (n: number) => `KES ${Number(n).toLocaleString()}`;

    const getCardCTA = (g: any) => {
        const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
        if (pct >= 90) return { type: 'badge', label: 'Nearly there!', color: '#10B981', bg: '#D1FAE5' };
        if (pct < 50) return { type: 'button', label: 'Contribute', color: C.gold };
        return { type: 'link', label: 'View Details', color: C.navy };
    };

    if (loading) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                    <SafeAreaView><View style={s.headerRow}>
                        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color={C.gold} /></TouchableOpacity>
                        <Text style={s.headerTitle}>Groups</Text>
                        <View style={{ width: 36 }} />
                    </View></SafeAreaView>
                </LinearGradient>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={C.navy} /></View>
            </View>
        );
    }

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                <SafeAreaView><View style={s.headerRow}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color={C.gold} /></TouchableOpacity>
                    <Text style={s.headerTitle}>Groups</Text>
                    <View style={{ width: 36 }} />
                </View></SafeAreaView>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}>

                {/* TOTAL SAVINGS CARD */}
                <View style={s.totalCard}>
                    <Text style={s.totalLabel}>Total Group Savings</Text>
                    <Text style={s.totalAmount}>{fmt(totalSaved)}</Text>
                    <View style={s.totalTrend}>
                        <Ionicons name="trending-up" size={14} color={C.green} />
                        <Text style={s.totalTrendTxt}>+12.5% from last month</Text>
                    </View>
                </View>

                {/* SECTION LABEL */}
                <Text style={s.sectionLabel}>YOUR ACTIVE GROUPS</Text>

                {/* GROUP CARDS */}
                {groups.map((g) => {
                    const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
                    const cta = getCardCTA(g);
                    return (
                        <TouchableOpacity key={g.id} style={s.groupCard}
                            onPress={() => router.push({ pathname: '/group-detail', params: { groupId: g.id.toString() } } as any)}
                            activeOpacity={0.85}>
                            <View style={s.groupCardTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.groupName}>{g.name}</Text>
                                    <Text style={s.groupDesc}>{g.description}</Text>
                                </View>
                                <ProgressRing pct={pct} color={g.color || C.navy} />
                            </View>
                            <View style={s.groupCardBottom}>
                                <AvatarPile members={g.members || []} total={g.totalMembers || (g.members?.length ?? 0)} />
                                <Text style={s.groupAmounts}>{fmt(g.saved)} / {g.target >= 1000000 ? (g.target / 1000000).toFixed(1) + 'M' : (g.target >= 1000 ? (g.target / 1000) + ',000' : g.target)}</Text>
                                {cta.type === 'badge' && (
                                    <View style={[s.ctaBadge, { backgroundColor: cta.bg }]}>
                                        <Text style={[s.ctaBadgeTxt, { color: cta.color }]}>{cta.label}</Text>
                                    </View>
                                )}
                                {cta.type === 'button' && (
                                    <TouchableOpacity style={[s.ctaBtn, { backgroundColor: cta.color }]}
                                        onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/contribute-group', params: { groupId: g.id.toString() } } as any); }}>
                                        <Text style={s.ctaBtnTxt}>{cta.label}</Text>
                                    </TouchableOpacity>
                                )}
                                {cta.type === 'link' && (
                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/group-detail', params: { groupId: g.id.toString() } } as any); }}>
                                        <Text style={[s.ctaLink, { color: cta.color }]}>{cta.label}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* CREATE GROUP FAB */}
            <TouchableOpacity style={s.createBtn} onPress={() => router.push('/create-group' as any)} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color={C.white} />
                <Text style={s.createBtnTxt}>Create Group</Text>
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 17, fontWeight: '800' },
    scroll: { padding: 16 },
    totalCard: { backgroundColor: C.white, borderRadius: 18, padding: 20, marginBottom: 22, shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3 },
    totalLabel: { fontSize: 13, color: C.sub, fontWeight: '600', marginBottom: 6 },
    totalAmount: { fontSize: 34, fontWeight: '900', color: C.green, letterSpacing: -0.5, marginBottom: 6 },
    totalTrend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    totalTrendTxt: { fontSize: 13, color: C.green, fontWeight: '600' },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.5, marginBottom: 14 },
    groupCard: { backgroundColor: C.white, borderRadius: 18, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
    groupCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
    groupName: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 4 },
    groupDesc: { fontSize: 13, color: C.sub },
    groupCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    groupAmounts: { flex: 1, fontSize: 13, color: C.sub, fontWeight: '600' },
    ctaBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    ctaBadgeTxt: { fontSize: 12, fontWeight: '700' },
    ctaBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    ctaBtnTxt: { color: C.white, fontSize: 13, fontWeight: '700' },
    ctaLink: { fontSize: 13, fontWeight: '700' },
    createBtn: { position: 'absolute', bottom: 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.gold, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, shadowColor: C.gold, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6 },
    createBtnTxt: { color: C.white, fontSize: 15, fontWeight: '800' },
});
