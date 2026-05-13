import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Image, ActivityIndicator, TextInput,
  StatusBar, ActionSheetIOS, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { FamilySettings as FamilySettingsType } from '@/types/family';
import apiService from '@/services/api';

const C = {
  navy: '#1a3a8f', navyDark: '#0e2470', gold: '#F59E0B',
  bg: '#F5F7FA', white: '#ffffff', text: '#1F2937',
  sub: '#6B7280', border: '#E5E7EB', red: '#EF4444', green: '#22C55E',
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  ADMIN:  { bg: '#EEF2FF', color: '#4F46E5' },
  MEMBER: { bg: '#F0FDF4', color: '#16A34A' },
  VIEWER: { bg: '#FFF7ED', color: '#C2410C' },
  OWNER:  { bg: '#EEF2FF', color: '#4F46E5' },
};

export default function FamilySettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<FamilySettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => { loadFamilySettings(); }, []));

  const loadFamilySettings = async () => {
    try {
      setLoading(true);
      const [settingsData, userData] = await Promise.all([
        apiService.getFamilySettings(),
        apiService.getCurrentUser(),
      ]);
      setSettings(settingsData);
      setCurrentUserId(userData.id.toString());
    } catch (error: any) {
      console.error('Error loading family settings:', error);
      Alert.alert('Error', error.error || 'Failed to load family settings');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleResendInvitation = (invitationId: number) => {
    Alert.alert('Success', 'Invitation resent successfully!');
  };

  const handleCancelInvitation = (invitationId: number) => {
    Alert.alert('Cancel Invitation', 'Are you sure you want to cancel this invitation?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: () => {
          if (!settings) return;
          setSettings({ ...settings, pendingInvitations: settings.pendingInvitations.filter(inv => inv.id !== invitationId) });
        },
      },
    ]);
  };

  const handleLeaveFamily = () => {
    Alert.alert('Leave Family', 'Are you sure you want to leave this family? You will lose access to all family data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          try {
            await apiService.leaveFamily();
            router.replace('/welcome');
          } catch (error: any) {
            Alert.alert('Error', error.error || 'Failed to leave family');
          }
        },
      },
    ]);
  };

  const handleDeleteFamily = () => {
    Alert.alert('Delete Family', 'This action cannot be undone. All data will be permanently lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever', style: 'destructive',
        onPress: async () => {
          try {
            await apiService.deleteFamily();
            router.replace('/welcome');
          } catch (error: any) {
            Alert.alert('Error', error.error || 'Failed to delete family');
          }
        },
      },
    ]);
  };

  const handleMemberMenu = (member: any) => {
    const isSelf = member.id.toString() === currentUserId;
    const options = isSelf
      ? ['View Details', 'Cancel']
      : ['View Details', 'Edit Permissions', 'Remove Member', 'Cancel'];
    const destructiveIndex = isSelf ? undefined : 2;
    const cancelIndex = isSelf ? 1 : 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIndex, cancelButtonIndex: cancelIndex },
        (idx) => {
          if (idx === 0) router.push({ pathname: '/member-details', params: { memberId: member.id.toString() } } as any);
          if (!isSelf && idx === 1) router.push({ pathname: '/edit-member-permissions', params: { memberId: member.id.toString() } } as any);
          if (!isSelf && idx === 2) {
            Alert.alert('Remove Member', `Remove ${member.name} from the family?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: async () => {
                try { await apiService.updateMemberPermissions(member.id, { active: false } as any); loadFamilySettings(); }
                catch (e: any) { Alert.alert('Error', e?.error || 'Failed to remove member.'); }
              }},
            ]);
          }
        }
      );
    } else {
      Alert.alert(member.name, 'Choose an action', [
        { text: 'View Details', onPress: () => router.push({ pathname: '/member-details', params: { memberId: member.id.toString() } } as any) },
        ...(!isSelf ? [
          { text: 'Edit Permissions', onPress: () => router.push({ pathname: '/edit-member-permissions', params: { memberId: member.id.toString() } } as any) },
          { text: 'Remove Member', style: 'destructive' as const, onPress: async () => {
            try { await apiService.updateMemberPermissions(member.id, { active: false } as any); loadFamilySettings(); }
            catch (e: any) { Alert.alert('Error', e?.error || 'Failed to remove member.'); }
          }},
        ] : []),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
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
              <Text style={s.headerTitle}>Family</Text>
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

  if (!settings) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
          <SafeAreaView>
            <View style={s.headerRow}>
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color={C.gold} />
              </TouchableOpacity>
              <Text style={s.headerTitle}>Family</Text>
              <View style={{ width: 36 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="alert-circle" size={56} color={C.red} />
          <Text style={{ marginTop: 12, color: C.sub, fontSize: 15 }}>Failed to load family</Text>
          <TouchableOpacity onPress={loadFamilySettings} style={{ marginTop: 16, backgroundColor: C.navy, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 }}>
            <Text style={{ color: C.white, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isOwner = settings.family.creatorId.toString() === currentUserId;
  const activeMemberCount = settings.members.filter((m: any) => m.status !== 'Pending').length;
  const filteredMembers = settings.members.filter((m: any) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

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
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>{settings.family.name}</Text>
              <View style={s.activeDot}>
                <View style={s.greenDot} />
                <Text style={s.activeText}>{activeMemberCount} Members Active</Text>
              </View>
            </View>
            <TouchableOpacity style={s.familyAvatarBtn} onPress={() => router.push('/edit-family-profile' as any)}>
              {settings.family.avatar
                ? <Image source={{ uri: apiService.getImageUrl(settings.family.avatar) }} style={s.familyAvatar} />
                : <View style={s.familyAvatarPlaceholder}><Ionicons name="people" size={18} color={C.white} /></View>
              }
              <View style={s.onlineDot} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={s.body}>
        {/* SEARCH */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color={C.sub} />
          <TextInput style={s.searchInput} placeholder="Search..." placeholderTextColor="#CBD5E1"
            value={search} onChangeText={setSearch} />
        </View>

        {/* MEMBER LIST HEADER */}
        <View style={s.listHeader}>
          <Text style={s.listHeaderTxt}>MEMBER LIST</Text>
          <TouchableOpacity>
            <Text style={s.sortTxt}>Sort by Role</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          {filteredMembers.map((member: any) => {
            const isSelf = member.id.toString() === currentUserId;
            const roleKey = (member.role || 'MEMBER').toUpperCase();
            const roleStyle = ROLE_COLORS[roleKey] || ROLE_COLORS.MEMBER;
            return (
              <TouchableOpacity key={member.id} style={s.memberRow}
                onPress={() => router.push({ pathname: '/member-details', params: { memberId: member.id.toString() } } as any)}
                activeOpacity={0.8}>
                <View style={s.memberAvatarWrap}>
                  {member.avatar
                    ? <Image source={{ uri: apiService.getImageUrl(member.avatar) }} style={s.memberAvatar} />
                    : <View style={s.memberAvatarPlaceholder}><Text style={s.memberAvatarTxt}>{member.name[0].toUpperCase()}</Text></View>
                  }
                  {member.status !== 'Pending' && <View style={s.memberOnlineDot} />}
                </View>
                <View style={s.memberInfo}>
                  <View style={s.memberNameRow}>
                    <Text style={s.memberName}>{member.name}{isSelf ? ' (You)' : ''}</Text>
                    <View style={[s.roleBadge, { backgroundColor: roleStyle.bg }]}>
                      <Text style={[s.roleBadgeTxt, { color: roleStyle.color }]}>{member.role}</Text>
                    </View>
                  </View>
                  <Text style={s.memberSub}>{member.relationship || (isSelf ? 'Self' : 'Family Member')}</Text>
                </View>
                <TouchableOpacity style={s.moreBtn} onPress={() => handleMemberMenu(member)}>
                  <Ionicons name="ellipsis-vertical" size={18} color={C.sub} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {/* PENDING INVITATIONS */}
          {settings.pendingInvitations.length > 0 && (
            <>
              <Text style={[s.listHeaderTxt, { marginTop: 20, marginBottom: 10 }]}>PENDING INVITATIONS</Text>
              {settings.pendingInvitations.map((inv: any) => (
                <View key={inv.id} style={s.invRow}>
                  <View style={s.invAvatar}><Ionicons name="mail" size={18} color={C.sub} /></View>
                  <View style={s.memberInfo}>
                    <Text style={s.memberName}>{inv.email}</Text>
                    <Text style={s.memberSub}>{inv.role} • Sent {formatDate(inv.sentAt)}</Text>
                  </View>
                  <TouchableOpacity style={s.invResend} onPress={() => handleResendInvitation(inv.id)}>
                    <Ionicons name="refresh" size={16} color={C.navy} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleCancelInvitation(inv.id)}>
                    <Ionicons name="close-circle" size={20} color={C.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* DANGER ZONE */}
          <View style={s.dangerSection}>
            <TouchableOpacity style={s.dangerBtn} onPress={handleLeaveFamily}>
              <Ionicons name="exit-outline" size={18} color={C.red} />
              <Text style={s.dangerBtnTxt}>Leave Family</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity style={[s.dangerBtn, { backgroundColor: C.red, borderColor: C.red }]} onPress={handleDeleteFamily}>
                <Ionicons name="trash-outline" size={18} color={C.white} />
                <Text style={[s.dangerBtnTxt, { color: C.white }]}>Delete Family</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* ADD MEMBER BUTTON */}
      <View style={s.addBtnWrap}>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/add-family-member' as any)} activeOpacity={0.85}>
          <Text style={s.addBtnTxt}>Add Member</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 18 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: C.gold, fontSize: 16, fontWeight: '800' },
  activeDot: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  activeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' },
  familyAvatarBtn: { position: 'relative' },
  familyAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: C.white },
  familyAvatarPlaceholder: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: C.green, borderWidth: 2, borderColor: C.white },
  body: { flex: 1, backgroundColor: C.white, paddingHorizontal: 18, paddingTop: 18 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 18 },
  searchInput: { flex: 1, fontSize: 15, color: C.text },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  listHeaderTxt: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.5 },
  sortTxt: { fontSize: 13, color: C.navy, fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  memberAvatarWrap: { position: 'relative' },
  memberAvatar: { width: 48, height: 48, borderRadius: 24 },
  memberAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  memberAvatarTxt: { fontSize: 18, fontWeight: '800', color: C.navy },
  memberOnlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: C.green, borderWidth: 1.5, borderColor: C.white },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontWeight: '700', color: C.text },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleBadgeTxt: { fontSize: 10, fontWeight: '700' },
  memberSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  moreBtn: { padding: 8 },
  invRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  invAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  invResend: { padding: 8 },
  dangerSection: { marginTop: 28, gap: 10, marginBottom: 20 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: C.red },
  dangerBtnTxt: { fontSize: 14, fontWeight: '600', color: C.red },
  addBtnWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
  addBtn: { backgroundColor: C.gold, borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  addBtnTxt: { color: C.white, fontSize: 17, fontWeight: '800' },
});
