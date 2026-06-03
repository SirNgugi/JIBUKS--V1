import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, SafeAreaView, Alert, ActivityIndicator,
    Modal, Switch, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '@/services/api';

const C = {
    navy: '#1a3a8f', navyDark: '#0e2470', gold: '#F59E0B',
    bg: '#F5F7FA', white: '#ffffff', text: '#1F2937', sub: '#6B7280',
    border: '#E5E7EB',
};

const CATEGORIES = [
    { key: 'food',      label: 'FOOD',      emoji: '🍎' },
    { key: 'transport', label: 'TRANSPORT', emoji: '🚗' },
    { key: 'bills',     label: 'BILLS',     emoji: '📄' },
    { key: 'shopping',  label: 'SHOPPING',  emoji: '🛍️' },
    { key: 'fun',       label: 'FUN',       emoji: '🎮' },
];

const ALL_CATEGORIES = [
    ...CATEGORIES,
    { key: 'health',    label: 'HEALTH',    emoji: '💊' },
    { key: 'education', label: 'EDUCATION', emoji: '📚' },
    { key: 'rent',      label: 'RENT',      emoji: '🏠' },
    { key: 'utilities', label: 'UTILITIES', emoji: '💡' },
    { key: 'travel',    label: 'TRAVEL',    emoji: '✈️' },
    { key: 'other',     label: 'OTHER',     emoji: '📦' },
];

export default function AddExpenseScreen() {
    const router = useRouter();

    const [amount, setAmount]         = useState('');
    const [selectedCat, setSelectedCat] = useState('food');
    const [details, setDetails]       = useState('');
    const [splitFamily, setSplitFamily] = useState(false);
    const [saving, setSaving]         = useState(false);
    const [showAllCats, setShowAllCats] = useState(false);

    const dateLabel = (() => {
        return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) === new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) ? 'Today' : 'Today';
    })();

    const activeCat = ALL_CATEGORIES.find(c => c.key === selectedCat) || CATEGORIES[0];

    const handleSave = async () => {
        const amt = parseFloat(amount);
        if (!amount || isNaN(amt) || amt <= 0) {
            Alert.alert('Invalid Amount', 'Please enter an amount.');
            return;
        }
        setSaving(true);
        try {
            await apiService.createTransaction({
                type: 'EXPENSE',
                amount: amt,
                category: activeCat.label,
                description: details || `${activeCat.label} expense`,
                date: new Date().toISOString(),
                paymentMethod: 'Cash',
                notes: splitFamily ? 'Split with family' : undefined,
            });
            Alert.alert('Saved!', 'Expense recorded.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            Alert.alert('Error', e?.error || e?.message || 'Failed to save expense.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* ── HEADER ── */}
            <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                <SafeAreaView>
                    <View style={s.headerRow}>
                        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={22} color={C.gold} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>Add Expense</Text>
                        <View style={{ width: 38 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled">

                    {/* ── AMOUNT CARD ── */}
                    <View style={s.amountCard}>
                        <Text style={s.amountLabel}>AMOUNT</Text>
                        <View style={s.amountRow}>
                            <Text style={s.kes}>KES</Text>
                            <TextInput
                                style={s.amountInput}
                                value={amount}
                                onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor="#CBD5E1"
                                cursorColor={C.gold}
                            />
                        </View>
                        <View style={s.datePill}>
                            <Ionicons name="calendar" size={14} color={C.sub} />
                            <Text style={s.datePillTxt}>{dateLabel}</Text>
                            <Ionicons name="chevron-down" size={14} color={C.sub} />
                        </View>
                    </View>

                    {/* ── CATEGORY ── */}
                    <View style={s.section}>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionTitle}>Category</Text>
                            <TouchableOpacity onPress={() => setShowAllCats(true)}>
                                <Text style={s.viewAll}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={s.catGrid}>
                            {CATEGORIES.map(cat => {
                                const active = selectedCat === cat.key;
                                return (
                                    <TouchableOpacity key={cat.key}
                                        style={[s.catCard, active && s.catCardActive]}
                                        onPress={() => setSelectedCat(cat.key)}
                                        activeOpacity={0.8}>
                                        <Text style={s.catEmoji}>{cat.emoji}</Text>
                                        <Text style={[s.catLabel, active && s.catLabelActive]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                            {/* MORE tile */}
                            <TouchableOpacity style={s.catCard} onPress={() => setShowAllCats(true)} activeOpacity={0.8}>
                                <View style={s.moreIcon}>
                                    <Ionicons name="add" size={22} color={C.sub} />
                                </View>
                                <Text style={s.catLabel}>MORE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── DETAILS ── */}
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Details</Text>
                        <View style={s.detailsRow}>
                            <TextInput
                                style={s.detailsInput}
                                placeholder="What was this for?"
                                placeholderTextColor={C.sub}
                                value={details}
                                onChangeText={setDetails}
                            />
                            <TouchableOpacity style={s.cameraBtn}>
                                <Ionicons name="camera" size={20} color={C.white} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── SPLIT WITH FAMILY ── */}
                    <View style={s.section}>
                        <View style={s.splitCard}>
                            <View style={s.splitIcon}>
                                <Ionicons name="people" size={22} color={C.navy} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.splitTitle}>Split with Family?</Text>
                                <Text style={s.splitSub}>Instantly divide with your household</Text>
                            </View>
                            <Switch
                                value={splitFamily}
                                onValueChange={setSplitFamily}
                                trackColor={{ false: C.border, true: C.gold }}
                                thumbColor={C.white}
                            />
                        </View>
                    </View>

                    {/* ── SAVE BUTTON ── */}
                    <View style={s.section}>
                        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]}
                            onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                            {saving
                                ? <ActivityIndicator color={C.white} />
                                : <>
                                    <Ionicons name="checkmark-circle" size={20} color={C.white} />
                                    <Text style={s.saveBtnTxt}>Save Expense</Text>
                                  </>
                            }
                        </TouchableOpacity>
                    </View>

                    {/* ── FOOTER ── */}
                    <View style={s.footer}>
                        <Text style={s.footerTxt}>Powered by </Text>
                        <Text style={s.footerBrand}>Apbc 🌍</Text>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── ALL CATEGORIES MODAL ── */}
            <Modal visible={showAllCats} animationType="slide" transparent>
                <View style={s.modalOverlay}>
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>All Categories</Text>
                            <TouchableOpacity onPress={() => setShowAllCats(false)}>
                                <Ionicons name="close" size={24} color={C.sub} />
                            </TouchableOpacity>
                        </View>
                        <View style={s.catGrid}>
                            {ALL_CATEGORIES.map(cat => {
                                const active = selectedCat === cat.key;
                                return (
                                    <TouchableOpacity key={cat.key}
                                        style={[s.catCard, active && s.catCardActive]}
                                        onPress={() => { setSelectedCat(cat.key); setShowAllCats(false); }}
                                        activeOpacity={0.8}>
                                        <Text style={s.catEmoji}>{cat.emoji}</Text>
                                        <Text style={[s.catLabel, active && s.catLabelActive]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root:        { flex: 1, backgroundColor: C.bg },
    header:      { paddingBottom: 20, paddingHorizontal: 20 },
    headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 18, fontWeight: '700' },

    scroll: { paddingBottom: 20 },

    amountCard: { marginHorizontal: 16, marginTop: 16, marginBottom: 16, backgroundColor: C.white, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4 },
    amountLabel: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 1.5, marginBottom: 10 },
    amountRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
    kes:         { fontSize: 20, fontWeight: '600', color: C.sub },
    amountInput: { fontSize: 48, fontWeight: '800', color: C.navy, minWidth: 140, textAlign: 'center' },
    datePill:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: C.border },
    datePillTxt: { fontSize: 13, fontWeight: '600', color: C.text },

    section:     { paddingHorizontal: 16, marginBottom: 16 },
    sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    viewAll:     { fontSize: 13, fontWeight: '600', color: C.gold },

    catGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catCard:     { width: '30%', backgroundColor: C.white, borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2, borderWidth: 1.5, borderColor: 'transparent' },
    catCardActive: { borderColor: C.navy, backgroundColor: '#EEF2FF' },
    catEmoji:    { fontSize: 28 },
    catLabel:    { fontSize: 10, fontWeight: '700', color: C.sub, letterSpacing: 0.5 },
    catLabelActive: { color: C.navy },
    moreIcon:    { width: 44, height: 44, borderRadius: 22, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },

    detailsRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
    detailsInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 14 },
    cameraBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },

    splitCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
    splitIcon:   { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    splitTitle:  { fontSize: 14, fontWeight: '700', color: C.text },
    splitSub:    { fontSize: 12, color: C.sub, marginTop: 2 },

    saveBtn:     { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: C.gold, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 6 },
    saveBtnTxt:  { fontSize: 16, fontWeight: '700', color: C.white },

    footer:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
    footerTxt:   { fontSize: 12, color: C.sub },
    footerBrand: { fontSize: 12, fontWeight: '700', color: C.navy },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet:   { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 },
    modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
    modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle:   { fontSize: 17, fontWeight: '700', color: C.text },
});

