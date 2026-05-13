import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, SafeAreaView, StatusBar, Alert, ActivityIndicator,
    Modal, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import apiService from '@/services/api';

const C = {
    navy: '#1a3a8f', navyDark: '#0e2470', gold: '#F59E0B',
    bg: '#F5F7FA', white: '#ffffff', text: '#1F2937',
    sub: '#6B7280', border: '#E5E7EB', green: '#22C55E',
};

const AVATAR_COLORS = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#EDE9FE'];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Colleague', 'Other'];

// ── Screen 1 ─────────────────────────────────────────────────────────────────
function FamilySelector({ groupId, onAddNew }: { groupId: string; onAddNew: () => void }) {
    const router = useRouter();
    const [members, setMembers]   = useState<any[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch]     = useState('');
    const [loading, setLoading]   = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useFocusEffect(useCallback(() => {
        apiService.getFamilySettings()
            .then(s => setMembers(s.members || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []));

    const toggle = (id: string) => {
        setSelected(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const filtered = members.filter(m =>
        m.name?.toLowerCase().includes(search.toLowerCase())
    );

    const selectedList = members.filter(m => selected.has(m.id.toString()));

    const handleAdd = async () => {
        if (selected.size === 0) {
            Alert.alert('No selection', 'Please select at least one member.');
            return;
        }
        try {
            setSubmitting(true);
            Alert.alert('Success', `${selected.size} member(s) added to group.`, [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            Alert.alert('Error', e?.error || 'Failed to add members.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={s.flex}>
            {/* SEARCH */}
            <View style={s.searchWrap}>
                <TextInput style={s.searchInput} placeholder="Search family member or add new"
                    placeholderTextColor="#CBD5E1" value={search} onChangeText={setSearch} />
                <Ionicons name="search" size={18} color={C.sub} />
            </View>

            <View style={s.listHeader}>
                <Text style={s.listLabel}>FROM YOUR FAMILY</Text>
                <Text style={s.listTotal}>{filtered.length} Total</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {loading && <ActivityIndicator size="small" color={C.navy} style={{ marginTop: 20 }} />}

                {filtered.map((m, i) => {
                    const isAdded = selected.has(m.id.toString());
                    return (
                        <View key={m.id} style={s.memberRow}>
                            <View style={[s.memberAvatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                                <Text style={s.memberAvatarTxt}>{(m.name || 'U')[0].toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={s.memberName}>{m.name}</Text>
                                <Text style={s.memberSub}>{m.relationship || m.role || 'Family'}</Text>
                            </View>
                            <TouchableOpacity
                                style={[s.addBtn, isAdded && s.addBtnAdded]}
                                onPress={() => toggle(m.id.toString())}>
                                {isAdded
                                    ? <><Ionicons name="checkmark" size={13} color={C.sub} /><Text style={s.addBtnAddedTxt}> Added</Text></>
                                    : <Text style={s.addBtnTxt}>Add</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* ADD NEW PERSON */}
                <TouchableOpacity style={s.addNewCard} onPress={onAddNew} activeOpacity={0.8}>
                    <View style={s.addNewIcon}><Ionicons name="person-add" size={20} color={C.navy} /></View>
                    <Text style={s.addNewTxt}>+ Add New Person</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* SELECTED FOOTER */}
            <View style={s.footer}>
                <View style={s.selectedRow}>
                    <Text style={s.selectedLabel}>SELECTED</Text>
                    <View style={s.avatarPile}>
                        {selectedList.slice(0, 3).map((m, i) => (
                            <View key={m.id} style={[s.selAvatar, { backgroundColor: AVATAR_COLORS[i], marginLeft: i > 0 ? -8 : 0 }]}>
                                <Text style={s.selAvatarTxt}>{(m.name || 'U')[0].toUpperCase()}</Text>
                            </View>
                        ))}
                        <TouchableOpacity style={[s.selAvatar, { backgroundColor: '#E5E7EB', marginLeft: selectedList.length > 0 ? -8 : 0 }]}>
                            <Ionicons name="add" size={14} color={C.sub} />
                        </TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity style={[s.addGroupBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleAdd} disabled={submitting} activeOpacity={0.85}>
                    {submitting
                        ? <ActivityIndicator color={C.white} />
                        : <Text style={s.addGroupBtnTxt}>Add to Group</Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Screen 2 ─────────────────────────────────────────────────────────────────
function AddNewPersonForm({ onCancel }: { onCancel: () => void }) {
    const router = useRouter();
    const { groupId } = useLocalSearchParams<{ groupId: string }>();

    const [avatar, setAvatar]             = useState<string | null>(null);
    const [name, setName]                 = useState('');
    const [relationship, setRelationship] = useState('');
    const [phone, setPhone]               = useState('');
    const [email, setEmail]               = useState('');
    const [role, setRole]                 = useState<'member' | 'admin'>('member');
    const [showRelModal, setShowRelModal] = useState(false);
    const [submitting, setSubmitting]     = useState(false);

    const pickAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.7,
        });
        if (!result.canceled) setAvatar(result.assets[0].uri);
    };

    const handleSendInvite = async () => {
        if (!name.trim()) { Alert.alert('Missing Info', 'Please enter the full name.'); return; }
        try {
            setSubmitting(true);
            await apiService.addFamilyMember({
                name, relationship, email, phone, role: role.toUpperCase(),
            });
            Alert.alert('Invite Sent!', `An invite has been sent to ${name}.`, [
                { text: 'OK', onPress: () => onCancel() },
            ]);
        } catch (e: any) {
            Alert.alert('Error', e?.error || 'Failed to send invite.');
        } finally {
            setSubmitting(false);
        }
    };

    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.formScroll}>
            {/* AVATAR */}
            <View style={s.avatarWrap}>
                <TouchableOpacity style={s.avatarCircle} onPress={pickAvatar}>
                    {avatar
                        ? <Image source={{ uri: avatar }} style={{ width: 90, height: 90, borderRadius: 45 }} />
                        : <Text style={s.avatarInitials}>{initials}</Text>
                    }
                    <View style={s.cameraBtn}>
                        <Ionicons name="camera" size={14} color={C.white} />
                    </View>
                </TouchableOpacity>
                <Text style={s.uploadTxt}>Upload profile photo</Text>
            </View>

            {/* FULL NAME */}
            <Text style={s.fieldLabel}>Full Name</Text>
            <TextInput style={s.fieldInput} placeholder="Jane Doe" placeholderTextColor="#CBD5E1"
                value={name} onChangeText={setName} />

            {/* RELATIONSHIP */}
            <Text style={s.fieldLabel}>Relationship</Text>
            <TouchableOpacity style={s.dropdown} onPress={() => setShowRelModal(true)}>
                <Text style={[s.dropdownTxt, !relationship && { color: '#CBD5E1' }]}>
                    {relationship || 'Select relationship'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={C.sub} />
            </TouchableOpacity>

            {/* PHONE */}
            <Text style={s.fieldLabel}>Phone Number</Text>
            <View style={s.phoneWrap}>
                <TextInput style={[s.fieldInput, { flex: 1 }]} placeholder="+254 712 345 678"
                    placeholderTextColor="#CBD5E1" keyboardType="phone-pad"
                    value={phone} onChangeText={setPhone} />
            </View>
            <View style={s.infoRow}>
                <Ionicons name="information-circle-outline" size={13} color={C.sub} />
                <Text style={s.infoTxt}>Used for communication and payment reference</Text>
            </View>

            {/* EMAIL */}
            <Text style={s.fieldLabel}>Email <Text style={s.optional}>(Optional)</Text></Text>
            <TextInput style={s.fieldInput} placeholder="jane@email.com" placeholderTextColor="#CBD5E1"
                keyboardType="email-address" autoCapitalize="none"
                value={email} onChangeText={setEmail} />

            {/* ROLE */}
            <Text style={s.fieldLabel}>Role in Group</Text>
            <View style={s.roleRow}>
                {(['member', 'admin'] as const).map(r => (
                    <TouchableOpacity key={r} style={[s.roleBtn, role === r && s.roleBtnActive]}
                        onPress={() => setRole(r)} activeOpacity={0.8}>
                        <Text style={[s.roleBtnTxt, role === r && s.roleBtnTxtActive]}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={s.roleCaption}>Most members should be standard members</Text>

            {/* SEND INVITE */}
            <TouchableOpacity style={[s.inviteBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSendInvite} disabled={submitting} activeOpacity={0.85}>
                {submitting
                    ? <ActivityIndicator color={C.white} />
                    : <Text style={s.inviteBtnTxt}>Send Invite</Text>
                }
            </TouchableOpacity>

            <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={onCancel}>
                <Text style={s.cancelTxt}>Cancel and Return</Text>
            </TouchableOpacity>

            <Text style={s.inviteCaption}>
                An invite will be sent for them to download the app and join the group.
            </Text>

            {/* RELATIONSHIP MODAL */}
            <Modal visible={showRelModal} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={s.modal}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Select Relationship</Text>
                            <TouchableOpacity onPress={() => setShowRelModal(false)}>
                                <Ionicons name="close" size={22} color={C.text} />
                            </TouchableOpacity>
                        </View>
                        {RELATIONSHIPS.map(r => (
                            <TouchableOpacity key={r} style={s.modalItem}
                                onPress={() => { setRelationship(r); setShowRelModal(false); }}>
                                <Text style={[s.modalItemTxt, relationship === r && { color: C.navy, fontWeight: '700' }]}>{r}</Text>
                                {relationship === r && <Ionicons name="checkmark-circle" size={18} color={C.gold} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AddGroupMembersScreen() {
    const router = useRouter();
    const { groupId } = useLocalSearchParams<{ groupId: string }>();
    const [view, setView] = useState<'list' | 'form'>('list');

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                <SafeAreaView><View style={s.headerRow}>
                    <TouchableOpacity style={s.backBtn}
                        onPress={() => view === 'form' ? setView('list') : router.back()}>
                        <Ionicons name="arrow-back" size={20} color={C.gold} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Add Members</Text>
                    <View style={{ width: 36 }} />
                </View></SafeAreaView>
            </LinearGradient>

            {view === 'list'
                ? <FamilySelector groupId={groupId!} onAddNew={() => setView('form')} />
                : <AddNewPersonForm onCancel={() => setView('list')} />
            }
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.white },
    flex: { flex: 1 },
    header: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 16, fontWeight: '800' },
    // List view
    searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 16, borderWidth: 1, borderColor: C.border, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 11, gap: 10 },
    searchInput: { flex: 1, fontSize: 14, color: C.text },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
    listLabel: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.5 },
    listTotal: { fontSize: 12, fontWeight: '600', color: C.navy },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    memberAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    memberAvatarTxt: { fontSize: 18, fontWeight: '800', color: C.navy },
    memberName: { fontSize: 15, fontWeight: '700', color: C.text },
    memberSub: { fontSize: 12, color: C.sub, marginTop: 2 },
    addBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: C.gold },
    addBtnAdded: { backgroundColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' },
    addBtnTxt: { color: C.white, fontSize: 13, fontWeight: '700' },
    addBtnAddedTxt: { color: C.sub, fontSize: 13, fontWeight: '600' },
    addNewCard: { margin: 16, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    addNewIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    addNewTxt: { fontSize: 14, fontWeight: '700', color: C.navy },
    footer: { borderTopWidth: 1, borderTopColor: C.border, padding: 16 },
    selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    selectedLabel: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.5 },
    avatarPile: { flexDirection: 'row', alignItems: 'center' },
    selAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white },
    selAvatarTxt: { fontSize: 11, fontWeight: '800', color: C.navy },
    addGroupBtn: { backgroundColor: C.gold, borderRadius: 28, paddingVertical: 15, alignItems: 'center' },
    addGroupBtnTxt: { color: C.white, fontSize: 16, fontWeight: '800' },
    // Form view
    formScroll: { padding: 20, paddingBottom: 40 },
    avatarWrap: { alignItems: 'center', marginBottom: 24 },
    avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#D4A76A', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    avatarInitials: { fontSize: 30, fontWeight: '800', color: C.white },
    cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
    uploadTxt: { fontSize: 13, color: C.sub, fontWeight: '600' },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
    optional: { color: '#CBD5E1', fontWeight: '400' },
    fieldInput: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: C.text, marginBottom: 16 },
    dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16 },
    dropdownTxt: { fontSize: 15, color: C.text },
    phoneWrap: { flexDirection: 'row', gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 16, marginTop: -10 },
    infoTxt: { fontSize: 11, color: C.sub },
    roleRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    roleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
    roleBtnActive: { borderColor: C.gold },
    roleBtnTxt: { fontSize: 14, fontWeight: '600', color: C.sub },
    roleBtnTxtActive: { color: C.gold, fontWeight: '700' },
    roleCaption: { fontSize: 12, color: C.sub, marginBottom: 20 },
    inviteBtn: { backgroundColor: C.gold, borderRadius: 28, paddingVertical: 16, alignItems: 'center', marginBottom: 4 },
    inviteBtnTxt: { color: C.white, fontSize: 16, fontWeight: '800' },
    cancelTxt: { fontSize: 14, color: C.navy, fontWeight: '600' },
    inviteCaption: { textAlign: 'center', fontSize: 12, color: C.sub, marginTop: 16, lineHeight: 18 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modal: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
    modalItemTxt: { fontSize: 15, color: C.sub },
});
