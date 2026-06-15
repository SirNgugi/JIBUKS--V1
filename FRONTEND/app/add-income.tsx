import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '@/services/api';

// Income source tiles
const INCOME_SOURCES = [
  { key: 'salary',   label: 'SALARY',   icon: 'briefcase',          iconColor: '#ffffff',  iconBg: 'rgba(255,255,255,0.25)' },
  { key: 'business', label: 'BUSINESS', icon: 'trending-up',        iconColor: '#F59E0B',  iconBg: '#FEF3C7' },
  { key: 'gift',     label: 'GIFT',     icon: 'gift',               iconColor: '#22C55E',  iconBg: '#DCFCE7' },
  { key: 'other',    label: 'OTHER',    icon: 'add-circle-outline',  iconColor: '#9CA3AF',  iconBg: '#F3F4F6' },
] as const;

export default function AddIncomeScreen() {
  const router = useRouter();

  const [activeSource, setActiveSource] = useState<string>('salary');
  const [amount, setAmount]             = useState('');
  const [description, setDescription]   = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const activeSrc = INCOME_SOURCES.find(s => s.key === activeSource) || INCOME_SOURCES[0];

  const dateLabel = (() => {
    const t = new Date();
    const d = new Date();
    if (d.toDateString() === t.toDateString()) return 'Today';
    const y = new Date(t); y.setDate(t.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  })();

  const handleSubmit = async () => {
    if (submitting) return;
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount.');
      return;
    }
    try {
      setSubmitting(true);
      await apiService.createTransaction({
        type: 'INCOME',
        amount: amt,
        category: activeSrc.label.charAt(0) + activeSrc.label.slice(1).toLowerCase(),
        description: description || `${activeSrc.label} income`,
        date: new Date().toISOString(),
        paymentMethod: 'Cash',
      });
      Alert.alert('Success', 'Income recorded successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.error || error.message || 'Failed to record income');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ── */}
      <LinearGradient colors={['#1a3a8f', '#0e2470']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFAA00" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add income</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── AMOUNT CARD ── */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>AMOUNT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountKes}>KES</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#CBD5E1"
              />
            </View>
            <TouchableOpacity style={styles.datePill}>
              <Ionicons name="calendar" size={14} color="#6B7280" />
              <Text style={styles.datePillText}>{dateLabel}</Text>
              <Ionicons name="chevron-down" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* ── SOURCE ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Source</Text>
            <View style={styles.sourceGrid}>
              {INCOME_SOURCES.map((src) => {
                const active = activeSource === src.key;
                return (
                  <TouchableOpacity
                    key={src.key}
                    style={[styles.sourceCard, active && styles.sourceCardActive]}
                    onPress={() => setActiveSource(src.key)}
                  >
                    <View style={[styles.sourceIconWrap, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : src.iconBg }]}>
                      <Ionicons name={src.icon as any} size={28} color={active ? '#ffffff' : src.iconColor} />
                    </View>
                    <Text style={[styles.sourceLabel, active && styles.sourceLabelActive]}>{src.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── DETAILS ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsRow}>
              <Ionicons name="document-text-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.detailsInput}
                placeholder="What was this from?"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* ── SUBMIT ── */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitTxt}>Save Income</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── FOOTER ── */}
          <View style={styles.footer}>
            <Text style={styles.footerTxt}>Powered by </Text>
            <Text style={styles.footerBrand}>Apbc 🌍</Text>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFAA00' },
  scroll: { paddingBottom: 20 },
  amountCard: { marginHorizontal: 16, marginTop: 12, marginBottom: 8, backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  amountLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountKes: { fontSize: 22, fontWeight: '600', color: '#9CA3AF' },
  amountInput: { fontSize: 42, fontWeight: '800', color: '#1F2937', minWidth: 120 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, backgroundColor: '#F5F7FA', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  datePillText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sourceCard: { width: '46%', backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1.5, borderColor: 'transparent' as any },
  sourceCardActive: { borderColor: '#1a3a8f', backgroundColor: '#1a3a8f' },
  sourceIconWrap: { width: 52, height: 52, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  sourceLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8 },
  sourceLabelActive: { color: '#ffffff' },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  detailsInput: { flex: 1, fontSize: 14, color: '#1F2937', paddingVertical: 14 },
  submitBtn: { backgroundColor: '#F59E0B', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  submitTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  footerTxt: { fontSize: 12, color: '#9CA3AF' },
  footerBrand: { fontSize: 12, fontWeight: '700', color: '#1a3a8f' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' as any, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  closeBtn: {},
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  modalItemText: { fontSize: 15, color: '#1F2937', flex: 1 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dropdownIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  dropdownTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  dropdownSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  // legacy aliases kept for any remaining references
  toggleContainer: {} as any,
  toggleBtn: {} as any,
  toggleBtnActive: {} as any,
  toggleText: {} as any,
  toggleTextActive: {} as any,
  content: {} as any,
  formContainer: {} as any,
  card: {} as any,
  headerTop: {} as any,
}) as any;
