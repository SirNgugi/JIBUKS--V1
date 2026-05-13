import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, ActivityIndicator, Alert, Clipboard,
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

function ProgressRing({ pct, color, size = 120, thickness = 12 }: { pct: number; color: string; size?: number; thickness?: number }) {
    const p = Math.min(Math.max(pct, 0), 100);
    const half = size / 2;
    const rightAngle = Math.min(p, 50) / 50 * 180;
    const leftAngle  = p > 50 ? (p - 50) / 50 * 180 : 0;
    return (
        <View style={{ width: size, height: size }}>
            <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, borderWidth: thickness, borderColor: '#E8ECF0' }} />
            <View style={{ position: 'absolute', width: half, height: size, right: 0, overflow: 'hidden' }}>
                <View style={{ width: size, height: size, borderRadius: half, borderWidth: thickness, borderColor: 'transparent', borderRightColor: color, borderTopColor: rightAngle > 90 ? color : 'transparent', position: 'absolute', right: 0, transform: [{ rotate: `${rightAngle - 180}deg` }] }} />
            </View>
            {p > 50 && (
                <View style={{ position: 'absolute', width: half, height: size, left: 0, overflow: 'hidden' }}>
                    <View style={{ width: size, height: size, borderRadius: half, borderWidth: thickness, borderColor: 'transparent', borderLeftColor: color, borderBottomColor: leftAngle > 90 ? color : 'transparent', position: 'absolute', left: 0, transform: [{ rotate: `${leftAngle}deg` }] }} />
                </View>
            )}
            <View style={{ position: 'absolute', margin: thickness, width: size - thickness * 2, height: size - thickness * 2, borderRadius: half - thickness, backgroundColor: C.white }} />
            <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: size * 0.21, fontWeight: '900', color }}>{p}%</Text>
                <Text style={{ fontSize: size * 0.09, color: C.sub, fontWeight: '600', marginTop: 2 }}>Saved</Text>
            </View>
        </View>
    );
}

const AVATAR_COLORS = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#EDE9FE'];

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Today, ${new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 86400000 * 2) return `Yesterday`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GroupDetailScreen() {
    const router = useRouter();
    const { groupId } = useLocalSearchParams<{ groupId: string }>();

    const [group, setGroup] = useState<any>(null);
    const [activity, setActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const [g, acts] = await Promise.all([
                apiService.getGroupDetails(groupId!),
                apiService.getGroupActivity(groupId!),
            ]);
            setGroup(g);
            setActivity(acts.slice(0, 3));
        } catch (e) { console.error('Failed to load group:', e); }
        finally { setLoading(false); }
    };

    useFocusEffect(useCallback(() => { if (groupId) load(); }, [groupId]));

    const copyPhone = () => {
        Clipboard.setString(group?.treasurer?.phone || '');
        Alert.alert('Copied', 'Phone number copied to clipboard');
    };

    if (loading || !group) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                    <SafeAreaView><View style={s.headerRow}>
                        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color={C.gold} /></TouchableOpacity>
                        <Text style={s.headerTitle}>Loading…</Text>
                        <View style={{ width: 36 }} />
                    </View></SafeAreaView>
                </LinearGradient>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={C.navy} /></View>
            </View>
        );
    }

    const pct = group.target > 0 ? Math.round((group.saved / group.target) * 100) : 0;
    const fmt = (n: number) => `KES ${Number(n).toLocaleString()}`;

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* HEADER */}
            <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                <SafeAreaView><View style={s.headerRow}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={C.gold} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>{group.name}</Text>
                    <TouchableOpacity style={s.backBtn}>
                        <Ionicons name="ellipsis-vertical" size={18} color={C.gold} />
                    </TouchableOpacity>
                </View></SafeAreaView>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

                {/* SAVINGS CARD */}
                <View style={s.savingsCard}>
                    <Text style={s.savedLabel}>Total Saved</Text>
                    <Text style={s.savedAmount}>{fmt(group.saved)}</Text>
                    <View style={s.targetRow}>
                        <View>
                            <Text style={s.targetLabel}>GROUP TARGET</Text>
                            <Text style={s.targetAmount}>{fmt(group.target)}</Text>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: group.status === 'active' ? '#DCFCE7' : '#FEF3C7' }]}>
                            <Text style={[s.statusTxt, { color: group.status === 'active' ? '#166534' : '#92400E' }]}>
                                {group.status === 'active' ? 'Active Group' : group.status}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* PROGRESS RING */}
                <View style={s.ringSection}>
                    <Text style={s.ringSectionLabel}>Savings Progress</Text>
                    <View style={s.ringWrap}>
                        <ProgressRing pct={pct} color={group.color || C.navy} size={130} thickness={14} />
                    </View>
                </View>

                {/* ACTION BUTTONS */}
                <View style={s.actionRow}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.gold }]}
                        onPress={() => router.push({ pathname: '/contribute-group', params: { groupId: group.id.toString() } } as any)}
                        activeOpacity={0.85}>
                        <Ionicons name="add" size={22} color={C.white} />
                        <Text style={s.actionBtnTxt}>Contribute</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.navy }]} activeOpacity={0.85}>
                        <Ionicons name="arrow-down" size={22} color={C.white} />
                        <Text style={s.actionBtnTxt}>Request</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#F1F5F9' }]}
                        onPress={() => router.push({ pathname: '/group-activity', params: { groupId: group.id.toString() } } as any)}
                        activeOpacity={0.85}>
                        <Ionicons name="clipboard" size={22} color={C.sub} />
                        <Text style={[s.actionBtnTxt, { color: C.sub }]}>Activity</Text>
                    </TouchableOpacity>
                </View>

                {/* MEMBERS ROW */}
                <View style={s.membersRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {(group.members || []).slice(0, 4).map((m: any, i: number) => (
                            <View key={m.id} style={[s.memberAvatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length], marginLeft: i > 0 ? -8 : 0 }]}>
                                <Text style={s.memberAvatarTxt}>{(m.name || 'U')[0].toUpperCase()}</Text>
                            </View>
                        ))}
                        {group.totalMembers > 4 && (
                            <View style={[s.memberAvatar, { backgroundColor: '#E5E7EB', marginLeft: -8 }]}>
                                <Text style={[s.memberAvatarTxt, { color: C.sub }]}>+{group.totalMembers - 4}</Text>
                            </View>
                        )}
                        <Text style={s.membersLabel}>
                            <Text style={{ fontWeight: '800', color: C.text }}>{group.totalMembers} Members</Text>
                            {'\n'}
                            <Text style={{ color: C.sub }}>Active this month</Text>
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/group-members', params: { groupId: group.id.toString() } } as any)}>
                        <Text style={s.manageLink}>Manage {'>'}</Text>
                    </TouchableOpacity>
                </View>

                {/* SEND CONTRIBUTIONS TO */}
                <View style={s.section}>
                    <View style={s.sectionTitleRow}>
                        <Ionicons name="send" size={16} color={C.gold} />
                        <Text style={s.sectionTitle}>Send Contributions To</Text>
                    </View>
                    <View style={s.treasurerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.treasurerLabel}>TREASURER NAME</Text>
                            <Text style={s.treasurerValue}>{group.treasurer?.name || '—'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={s.treasurerLabel}>METHOD</Text>
                            <Text style={[s.treasurerValue, { color: C.green }]}>{group.treasurer?.method || 'M-Pesa'}</Text>
                        </View>
                    </View>
                    <View style={s.phoneRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.treasurerLabel}>Phone Number</Text>
                            <Text style={s.treasurerValue}>{group.treasurer?.phone || '—'}</Text>
                        </View>
                        <TouchableOpacity style={s.copyBtn} onPress={copyPhone}>
                            <Ionicons name="copy-outline" size={18} color={C.sub} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* RECENT ACTIVITY */}
                <View style={s.section}>
                    <View style={s.actHeaderRow}>
                        <Text style={s.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/group-activity', params: { groupId: group.id.toString() } } as any)}>
                            <Text style={s.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {activity.map((act) => {
                        const isContributed = act.status === 'contributed';
                        const isPending = act.status === 'pending';
                        return (
                            <View key={act.id} style={s.actRow}>
                                <View style={[s.actAvatar, { backgroundColor: AVATAR_COLORS[act.id % AVATAR_COLORS.length] }]}>
                                    <Text style={s.actAvatarTxt}>{(act.memberName || 'U')[0].toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.actName}>{act.memberName} {isContributed ? 'contributed' : isPending ? 'pending' : act.status}</Text>
                                    <Text style={s.actTime}>{isPending ? 'Waiting for confirmation' : timeAgo(act.date)}</Text>
                                </View>
                                {isContributed && (
                                    <Text style={s.actAmount}>+{Number(act.amount).toLocaleString()}{'\n'}KES</Text>
                                )}
                                {isPending && (
                                    <View style={s.processingBadge}>
                                        <Ionicons name="time" size={12} color={C.gold} />
                                        <Text style={s.processingTxt}>Processing</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
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
    headerTitle: { color: C.gold, fontSize: 16, fontWeight: '800' },
    scroll: { padding: 16 },
    savingsCard: { backgroundColor: C.white, borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3 },
    savedLabel: { fontSize: 12, color: C.sub, fontWeight: '600', marginBottom: 4 },
    savedAmount: { fontSize: 36, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 12 },
    targetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    targetLabel: { fontSize: 10, fontWeight: '700', color: C.sub, letterSpacing: 0.5, marginBottom: 2 },
    targetAmount: { fontSize: 18, fontWeight: '800', color: C.text },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    statusTxt: { fontSize: 12, fontWeight: '700' },
    ringSection: { backgroundColor: C.white, borderRadius: 20, padding: 20, marginBottom: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
    ringSectionLabel: { fontSize: 13, fontWeight: '600', color: C.sub, marginBottom: 14 },
    ringWrap: { marginVertical: 4 },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, gap: 6 },
    actionBtnTxt: { fontSize: 12, fontWeight: '700', color: C.white },
    membersRow: { backgroundColor: C.white, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    memberAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white },
    memberAvatarTxt: { fontSize: 12, fontWeight: '800', color: C.navy },
    membersLabel: { marginLeft: 8, fontSize: 13, lineHeight: 18 },
    manageLink: { fontSize: 13, color: C.navy, fontWeight: '700' },
    section: { backgroundColor: C.white, borderRadius: 16, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    treasurerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    treasurerLabel: { fontSize: 10, fontWeight: '700', color: C.sub, letterSpacing: 0.5, marginBottom: 3 },
    treasurerValue: { fontSize: 15, fontWeight: '700', color: C.text },
    phoneRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
    copyBtn: { padding: 8 },
    actHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    seeAll: { fontSize: 13, color: C.navy, fontWeight: '700' },
    actRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    actAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    actAvatarTxt: { fontSize: 15, fontWeight: '800', color: C.navy },
    actName: { fontSize: 14, fontWeight: '600', color: C.text },
    actTime: { fontSize: 12, color: C.sub, marginTop: 2 },
    actAmount: { fontSize: 12, fontWeight: '800', color: C.green, textAlign: 'right' },
    processingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    processingTxt: { fontSize: 11, fontWeight: '600', color: C.gold },
});
