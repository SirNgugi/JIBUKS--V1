import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import apiService from '@/services/api';

const C = {
    navy: '#1a3a8f', navyDark: '#0e2470', gold: '#F59E0B',
    bg: '#F5F7FA', white: '#ffffff', text: '#1F2937',
    sub: '#6B7280', border: '#E5E7EB', green: '#22C55E', red: '#EF4444',
};

const TABS = ['All', 'Contributions', 'Pending'];
const AVATAR_COLORS = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#EDE9FE'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    contributed: { label: 'Contributed', color: C.green,  bg: '#DCFCE7' },
    pending:     { label: 'Pending',     color: C.gold,   bg: '#FFFBEB' },
    missed:      { label: 'Missed',      color: C.red,    bg: '#FEE2E2' },
    waiting:     { label: 'Waiting',     color: C.sub,    bg: '#F1F5F9' },
};

function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    if (diff < 86400000) return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 86400000 * 2) return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GroupActivityScreen() {
    const router = useRouter();
    const { groupId } = useLocalSearchParams<{ groupId: string }>();

    const [activity, setActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('All');

    const load = async () => {
        try {
            const data = await apiService.getGroupActivity(groupId!);
            setActivity(data || []);
        } catch (e) { console.error('Failed to load activity:', e); }
        finally { setLoading(false); }
    };

    useFocusEffect(useCallback(() => { if (groupId) load(); }, [groupId]));

    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const filtered = activity.filter((a) => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Contributions') return a.status === 'contributed';
        if (activeTab === 'Pending') return a.status === 'pending' || a.status === 'waiting';
        return true;
    });

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* HEADER */}
            <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                <SafeAreaView><View style={s.headerRow}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={C.gold} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Activity</Text>
                    <TouchableOpacity style={s.backBtn}>
                        <Ionicons name="ellipsis-vertical" size={18} color={C.gold} />
                    </TouchableOpacity>
                </View></SafeAreaView>
            </LinearGradient>

            {/* FILTER TABS */}
            <View style={s.tabBar}>
                {TABS.map((tab) => (
                    <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]}
                        onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
                        <Text style={[s.tabTxt, activeTab === tab && s.tabTxtActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={C.navy} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}>

                    {filtered.length === 0 && (
                        <View style={s.empty}>
                            <Ionicons name="clipboard-outline" size={48} color={C.border} />
                            <Text style={s.emptyTxt}>No activity yet</Text>
                        </View>
                    )}

                    {filtered.map((act, idx) => {
                        const cfg = STATUS_CONFIG[act.status] || STATUS_CONFIG.waiting;
                        const isContrib = act.status === 'contributed';
                        return (
                            <View key={act.id} style={s.actRow}>
                                <View style={[s.avatar, { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }]}>
                                    <Text style={s.avatarTxt}>{(act.memberName || 'U')[0].toUpperCase()}</Text>
                                </View>
                                <View style={s.actInfo}>
                                    <Text style={s.actName}>{act.memberName}</Text>
                                    <Text style={s.actTime}>{act.status === 'pending' ? 'Waiting' : timeAgo(act.date)}</Text>
                                    <View style={[s.statusChip, { backgroundColor: cfg.bg }]}>
                                        <Text style={[s.statusChipTxt, { color: cfg.color }]}>{cfg.label}</Text>
                                    </View>
                                </View>
                                <Text style={[s.actAmount, { color: isContrib ? C.text : C.sub }]}>
                                    KES {Number(act.amount).toLocaleString()}
                                </Text>
                            </View>
                        );
                    })}

                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* FAB */}
            <TouchableOpacity style={s.fab}
                onPress={() => router.push({ pathname: '/contribute-group', params: { groupId } } as any)}
                activeOpacity={0.85}>
                <Ionicons name="add" size={26} color={C.white} />
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 16, fontWeight: '800' },
    tabBar: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
    tabActive: { backgroundColor: C.navy },
    tabTxt: { fontSize: 13, fontWeight: '600', color: C.sub },
    tabTxtActive: { color: C.white },
    scroll: { padding: 16 },
    actRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { fontSize: 18, fontWeight: '800', color: C.navy },
    actInfo: { flex: 1 },
    actName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
    actTime: { fontSize: 12, color: C.sub, marginBottom: 5 },
    statusChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    statusChipTxt: { fontSize: 11, fontWeight: '700' },
    actAmount: { fontSize: 15, fontWeight: '800' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyTxt: { fontSize: 15, color: C.sub },
    fab: { position: 'absolute', bottom: 28, right: 24, width: 54, height: 54, borderRadius: 27, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', shadowColor: C.navy, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 5 }, shadowRadius: 12, elevation: 8 },
});
