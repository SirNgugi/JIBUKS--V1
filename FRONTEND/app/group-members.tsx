import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, ActivityIndicator, TextInput,
    Alert, Platform, ActionSheetIOS, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import apiService from '@/services/api';

const C = {
    navy: '#1a3a8f', navyDark: '#0e2470', gold: '#F59E0B',
    bg: '#F5F7FA', white: '#ffffff', text: '#1F2937',
    sub: '#6B7280', border: '#E5E7EB', green: '#22C55E', orange: '#F97316',
};

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
    ADMIN:  { bg: '#EEF2FF', color: '#4F46E5' },
    MEMBER: { bg: '#F0FDF4', color: '#15803D' },
    OWNER:  { bg: '#EEF2FF', color: '#4F46E5' },
};

const AVATAR_COLORS = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#EDE9FE'];

// Mock payment status per member index for demo
const mockStatus = ['paid', 'pending', 'paid', 'paid', 'pending', 'paid', 'paid', 'pending'];

export default function GroupMembersScreen() {
    const router = useRouter();
    const { groupId } = useLocalSearchParams<{ groupId: string }>();

    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const load = async () => {
        try {
            const g = await apiService.getGroupDetails(groupId!);
            setGroup(g);
        } catch (e) { console.error('Failed to load group members:', e); }
        finally { setLoading(false); }
    };

    useFocusEffect(useCallback(() => { if (groupId) load(); }, [groupId]));

    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const handleMemberMenu = (member: any) => {
        const options = ['View Details', 'Mark as Paid', 'Remove from Group', 'Cancel'];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, destructiveButtonIndex: 2, cancelButtonIndex: 3 },
                (idx) => {
                    if (idx === 0) router.push({ pathname: '/member-details', params: { memberId: member.id.toString() } } as any);
                    if (idx === 1) Alert.alert('Marked', `${member.name} marked as paid.`);
                    if (idx === 2) Alert.alert('Remove Member', `Remove ${member.name} from the group?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => {} },
                    ]);
                }
            );
        } else {
            Alert.alert(member.name, 'Choose an action', [
                { text: 'View Details', onPress: () => router.push({ pathname: '/member-details', params: { memberId: member.id.toString() } } as any) },
                { text: 'Mark as Paid', onPress: () => Alert.alert('Marked', `${member.name} marked as paid.`) },
                { text: 'Remove from Group', style: 'destructive', onPress: () => {} },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }
    };

    if (loading) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                    <SafeAreaView><View style={s.headerRow}>
                        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color={C.gold} /></TouchableOpacity>
                        <Text style={s.headerTitle}>Members</Text>
                        <View style={{ width: 36 }} />
                    </View></SafeAreaView>
                </LinearGradient>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={C.navy} /></View>
            </View>
        );
    }

    const allMembers = group?.members || [];
    const filtered = allMembers.filter((m: any) =>
        m.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* HEADER */}
            <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                <SafeAreaView><View style={s.headerRow}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={C.gold} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Members</Text>
                    <View style={{ width: 36 }} />
                </View></SafeAreaView>
            </LinearGradient>

            <View style={s.body}>
                {/* TOTAL CARD */}
                <View style={s.totalCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.totalLabel}>TOTAL GROUP MEMBERS</Text>
                        <Text style={s.totalCount}>{group?.totalMembers || allMembers.length} Members</Text>
                    </View>
                    <View style={s.totalIcon}>
                        <Ionicons name="people" size={22} color={C.navy} />
                    </View>
                </View>

                {/* SEARCH */}
                <View style={s.searchWrap}>
                    <TextInput style={s.searchInput} placeholder="Search members…" placeholderTextColor="#CBD5E1"
                        value={search} onChangeText={setSearch} />
                    <Ionicons name="search" size={18} color={C.sub} />
                </View>

                {/* SECTION LABEL */}
                <Text style={s.sectionLabel}>ACTIVE FAMILY</Text>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}>
                    {filtered.map((member: any, idx: number) => {
                        const payStatus = mockStatus[idx % mockStatus.length];
                        const isPaid = payStatus === 'paid';
                        const roleKey = (member.role || 'MEMBER').toUpperCase();
                        const roleSt = ROLE_STYLE[roleKey] || ROLE_STYLE.MEMBER;
                        return (
                            <View key={member.id} style={s.memberRow}>
                                <View style={[s.avatar, { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }]}>
                                    <Text style={s.avatarTxt}>{(member.name || 'U')[0].toUpperCase()}</Text>
                                </View>
                                <View style={s.memberInfo}>
                                    <View style={s.nameRow}>
                                        <Text style={s.memberName}>{member.name}</Text>
                                        <View style={[s.roleBadge, { backgroundColor: roleSt.bg }]}>
                                            <Text style={[s.roleBadgeTxt, { color: roleSt.color }]}>{member.role || 'MEMBER'}</Text>
                                        </View>
                                    </View>
                                    <View style={s.statusRow}>
                                        <Ionicons
                                            name={isPaid ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={14}
                                            color={isPaid ? C.green : C.orange}
                                        />
                                        <Text style={[s.statusTxt, { color: isPaid ? C.green : C.orange }]}>
                                            {isPaid ? 'Paid this month' : 'Pending Payment'}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={s.moreBtn} onPress={() => handleMemberMenu(member)}>
                                    <Ionicons name="ellipsis-vertical" size={18} color={C.sub} />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ADD MEMBER BUTTON */}
            <View style={s.addWrap}>
                <TouchableOpacity style={s.addBtn}
                    onPress={() => router.push('/add-family-member' as any)} activeOpacity={0.85}>
                    <Ionicons name="add" size={18} color={C.white} />
                    <Text style={s.addBtnTxt}>Add Member</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 16, fontWeight: '800' },
    body: { flex: 1, backgroundColor: C.white, paddingHorizontal: 18, paddingTop: 18 },
    totalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 16 },
    totalLabel: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.5, marginBottom: 4 },
    totalCount: { fontSize: 24, fontWeight: '900', color: C.navy },
    totalIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16, gap: 10 },
    searchInput: { flex: 1, fontSize: 15, color: C.text },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.5, marginBottom: 12 },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { fontSize: 18, fontWeight: '800', color: C.navy },
    memberInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    memberName: { fontSize: 15, fontWeight: '700', color: C.text },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    roleBadgeTxt: { fontSize: 10, fontWeight: '700' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statusTxt: { fontSize: 12, fontWeight: '600' },
    moreBtn: { padding: 8 },
    addWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
    addBtn: { backgroundColor: C.gold, borderRadius: 28, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addBtnTxt: { color: C.white, fontSize: 16, fontWeight: '800' },
});
