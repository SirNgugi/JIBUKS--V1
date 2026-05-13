import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Image, Alert, Platform, SafeAreaView, StatusBar, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import apiService from '@/services/api';

const C = {
  navy: '#1a3a8f', navyDark: '#0e2470', gold: '#F59E0B',
  bg: '#F5F7FA', white: '#ffffff', text: '#1F2937',
  sub: '#6B7280', border: '#E5E7EB',
};

const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Guardian', 'Friend', 'Other'];

const ROLES = [
  { key: 'ADMIN',  label: 'Admin',  desc: 'Full control over all transactions & members' },
  { key: 'MEMBER', label: 'Member', desc: 'Can add and manage personal transactions' },
  { key: 'VIEWER', label: 'Viewer', desc: 'Read-only access to view family activity' },
];

function getInitials(fullName: string) {
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AddFamilyMemberScreen() {
  const router = useRouter();

  // ── state (all original fields preserved) ──
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [showRelModal, setShowRelModal] = useState(false);

  // ── image picker (original logic) ──
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions to select a photo');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setProfileImage(result.assets[0].uri);
  };

  // ── submit (original logic preserved, success navigates to new screen) ──
  const handleAddMember = async () => {
    if (!name.trim()) { Alert.alert('Error', "Please enter the member's name"); return; }
    if (!email.trim()) { Alert.alert('Error', 'Please enter an email address'); return; }
    if (!password.trim()) { Alert.alert('Error', 'Please enter a temporary password'); return; }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('role', role);
      if (phone.trim()) formData.append('phone', phone);

      if (profileImage) {
        if (Platform.OS === 'web') {
          try {
            const response = await fetch(profileImage);
            const blob = await response.blob();
            const filename = profileImage.split('/').pop() || 'profile.jpg';
            // @ts-ignore
            formData.append('profileImage', blob, filename);
          } catch (err) { console.error('Error processing image:', err); }
        } else {
          const filename = profileImage.split('/').pop() || 'profile.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          // @ts-ignore
          formData.append('profileImage', { uri: profileImage, name: filename, type });
        }
      }

      await apiService.addFamilyMember(formData);
      router.replace({ pathname: '/member-added-success', params: { memberName: name.split(' ')[0] } } as any);
    } catch (error: any) {
      console.error('Add member error:', error);
      Alert.alert('Error', error.error || error.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const initials = getInitials(name);
  const activeRole = ROLES.find(r => r.key === role) || ROLES[0];

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
            <Text style={s.headerTitle}>Add Family Members</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── WHITE CARD ── */}
      <ScrollView style={s.card} showsVerticalScrollIndicator={false} contentContainerStyle={s.cardContent}>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <TouchableOpacity style={s.avatarWrap} onPress={pickImage} activeOpacity={0.8}>
            {profileImage
              ? <Image source={{ uri: profileImage }} style={s.avatarImg} />
              : (
                <View style={s.avatarInitials}>
                  <Text style={s.initialsText}>{initials}</Text>
                </View>
              )}
            <View style={s.cameraBtn}>
              <Ionicons name="camera" size={14} color={C.white} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage}>
            <Text style={s.uploadLink}>Upload Member Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Full Name */}
        <Text style={s.label}>Full Name</Text>
        <TextInput style={s.input} placeholder="e.g. Jane Doe" placeholderTextColor="#CBD5E1"
          value={name} onChangeText={setName} />

        {/* Relationship */}
        <Text style={s.label}>Relationship</Text>
        <TouchableOpacity style={s.dropdown} onPress={() => setShowRelModal(true)} activeOpacity={0.8}>
          <Text style={[s.dropdownTxt, !relationship && { color: '#CBD5E1' }]}>
            {relationship || 'Select relationship'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={C.sub} />
        </TouchableOpacity>

        {/* Phone */}
        <Text style={s.label}>Phone Number <Text style={s.optional}>(Optional)</Text></Text>
        <TextInput style={s.input} placeholder="+1 (555) 000-0000" placeholderTextColor="#CBD5E1"
          keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

        {/* Email */}
        <Text style={s.label}>Email Address <Text style={s.optional}>(Optional)</Text></Text>
        <TextInput style={s.input} placeholder="jane@family.com" placeholderTextColor="#CBD5E1"
          keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

        {/* Password (required by API) */}
        <Text style={s.label}>Temporary Password</Text>
        <TextInput style={s.input} placeholder="Create a temporary password" placeholderTextColor="#CBD5E1"
          secureTextEntry value={password} onChangeText={setPassword} />

        {/* Account Role */}
        <Text style={[s.label, { marginTop: 4 }]}>Account Role</Text>
        {ROLES.map((r) => {
          const active = r.key === role;
          return (
            <TouchableOpacity key={r.key} style={[s.roleCard, active && s.roleCardActive]}
              onPress={() => setRole(r.key)} activeOpacity={0.8}>
              <View style={s.roleCardLeft}>
                <Text style={[s.roleLabel, active && { color: C.white }]}>{r.label}</Text>
                {active && <Ionicons name="shield-checkmark" size={14} color={C.white} style={{ marginLeft: 6 }} />}
                <Text style={[s.roleDesc, active && { color: 'rgba(255,255,255,0.8)' }]}>{r.desc}</Text>
              </View>
              <View style={[s.radioCircle, active && s.radioCircleActive]}>
                {active && <View style={s.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Card Preview */}
        <Text style={s.previewLabel}>CARD PREVIEW</Text>
        <View style={s.previewCard}>
          <View style={s.previewAvatar}>
            <Text style={s.previewInitials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.previewName}>{name || 'Jane Doe'}</Text>
            <View style={s.previewTags}>
              <Text style={s.previewTag}>{relationship || 'Spouse'}</Text>
              <Text style={[s.previewTag, { backgroundColor: '#EEF2FF', color: C.navy }]}>{activeRole.label}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.sub} />
        </View>

        {/* Add Member Button */}
        <TouchableOpacity style={[s.addBtn, loading && { opacity: 0.7 }]}
          onPress={handleAddMember} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={C.white} /> : <Text style={s.addBtnTxt}>Add Member</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── RELATIONSHIP MODAL ── */}
      <Modal visible={showRelModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Relationship</Text>
              <TouchableOpacity onPress={() => setShowRelModal(false)}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            {RELATIONSHIPS.map((rel) => (
              <TouchableOpacity key={rel} style={s.modalItem}
                onPress={() => { setRelationship(rel); setShowRelModal(false); }}>
                <Text style={[s.modalItemTxt, relationship === rel && { color: C.navy, fontWeight: '700' }]}>{rel}</Text>
                {relationship === rel && <Ionicons name="checkmark-circle" size={18} color={C.gold} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 18 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.gold, fontSize: 16, fontWeight: '800' },
  card: { flex: 1, backgroundColor: C.white, borderTopLeftRadius: 0 },
  cardContent: { paddingHorizontal: 22, paddingTop: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 22 },
  avatarWrap: { position: 'relative', marginBottom: 8 },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarInitials: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 28, fontWeight: '800', color: C.sub },
  cameraBtn: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white },
  uploadLink: { fontSize: 13, color: C.gold, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
  optional: { color: C.sub, fontWeight: '400' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: C.text, marginBottom: 18 },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 18 },
  dropdownTxt: { fontSize: 15, color: C.text },
  roleCard: { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  roleCardActive: { backgroundColor: C.navy, borderColor: C.navy },
  roleCardLeft: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  roleDesc: { fontSize: 12, color: C.sub, marginTop: 3 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: C.white },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.white },
  previewLabel: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.5, marginTop: 8, marginBottom: 10 },
  previewCard: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  previewAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  previewInitials: { color: C.white, fontWeight: '800', fontSize: 15 },
  previewName: { fontSize: 14, fontWeight: '700', color: C.text },
  previewTags: { flexDirection: 'row', gap: 6, marginTop: 4 },
  previewTag: { fontSize: 11, fontWeight: '600', backgroundColor: '#F1F5F9', color: C.sub, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  addBtn: { backgroundColor: C.gold, borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  addBtnTxt: { color: C.white, fontSize: 17, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  modalItemTxt: { fontSize: 15, color: C.sub },
});
