import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '@/services/api';
import Toast from 'react-native-toast-message';

const C = {
    navy: '#1a3a8f', navyDark: '#0e2470', accent: '#F97316', gold: '#F59E0B',
    bg: '#F5F7FA', white: '#ffffff', text: '#1F2937',
    sub: '#6B7280', border: '#E5E7EB', green: '#22C55E', red: '#EF4444',
    card: '#ffffff', track: '#E9ECEF',
};

const PRESET_CATEGORIES = [
    { category: 'Food & Groceries',  icon: 'restaurant',      color: '#EF4444' },
    { category: 'Housing & Rent',    icon: 'home',             color: '#3B82F6' },
    { category: 'Transport',         icon: 'car',              color: '#8B5CF6' },
    { category: 'Utilities',         icon: 'flash',            color: '#F59E0B' },
    { category: 'Education',         icon: 'school',           color: '#10B981' },
    { category: 'Health',            icon: 'medical',          color: '#EC4899' },
    { category: 'Entertainment',     icon: 'game-controller',  color: '#6366F1' },
    { category: 'Clothing',          icon: 'shirt',            color: '#14B8A6' },
    { category: 'Savings',           icon: 'wallet',           color: '#22C55E' },
    { category: 'Personal Care',     icon: 'happy',            color: '#F97316' },
];

export default function MonthlyBudgetsScreen() {
    const router = useRouter();
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useFocusEffect(useCallback(() => {
        loadExisting();
    }, []));

    const loadExisting = async () => {
        try {
            const data = await apiService.getFamilyBudgets();
            if (data && data.length > 0) {
                const map: Record<string, string> = {};
                data.forEach((b: any) => {
                    const key = b.category;
                    const val = b.amount ?? b.limit ?? '';
                    if (key) map[key] = String(val);
                });
                setAmounts(map);
            }
        } catch (e) {
            console.error('Failed to load budgets:', e);
        } finally {
            setLoading(false);
        }
    };

    const totalBudget = Object.values(amounts).reduce((sum, v) => {
        const n = parseFloat(v);
        return sum + (isNaN(n) ? 0 : n);
    }, 0);

    const handleSave = async () => {
        const budgets = PRESET_CATEGORIES
            .filter(c => amounts[c.category] && parseFloat(amounts[c.category]) > 0)
            .map(c => ({ category: c.category, amount: parseFloat(amounts[c.category]) }));

        if (budgets.length === 0) {
            Toast.show({ type: 'error', text1: 'Set at least one budget amount' });
            return;
        }

        try {
            setSaving(true);
            await apiService.saveFamilyBudgets(budgets);
            Toast.show({ type: 'success', text1: 'Budgets saved!', text2: `${budgets.length} categories set` });
            router.back();
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Failed to save budgets' });
        } finally {
            setSaving(false);
        }
    };

    const now = new Date();
    const monthLabel = now.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

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
                        <Text style={s.headerTitle}>MONTHLY BUDGETS</Text>
                        <TouchableOpacity style={s.backBtn} onPress={() => router.push('/budget-categories' as any)}>
                            <Ionicons name="bar-chart" size={20} color={C.gold} />
                        </TouchableOpacity>
                    </View>
                    <Text style={s.headerSub}>{monthLabel}</Text>
                </SafeAreaView>
            </LinearGradient>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={C.navy} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* TOTAL CARD */}
                    <View style={s.totalCard}>
                        <View style={s.totalLeft}>
                            <Text style={s.totalLabel}>TOTAL MONTHLY BUDGET</Text>
                            <Text style={s.totalAmount}>
                                KES {totalBudget.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                            </Text>
                        </View>
                        <View style={s.totalRight}>
                            <Ionicons name="wallet" size={32} color={C.navy} />
                        </View>
                    </View>

                    <Text style={s.sectionTitle}>Set Budget Per Category</Text>
                    <Text style={s.sectionSub}>Enter 0 or leave blank to skip a category</Text>

                    {/* CATEGORY ROWS */}
                    {PRESET_CATEGORIES.map((cat) => (
                        <View key={cat.category} style={s.catRow}>
                            <View style={[s.catIcon, { backgroundColor: cat.color + '20' }]}>
                                <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                            </View>
                            <Text style={s.catName}>{cat.category}</Text>
                            <View style={s.inputWrap}>
                                <Text style={s.currency}>KES</Text>
                                <TextInput
                                    style={s.input}
                                    value={amounts[cat.category] ?? ''}
                                    onChangeText={v => setAmounts(prev => ({ ...prev, [cat.category]: v }))}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={C.sub}
                                />
                            </View>
                        </View>
                    ))}

                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* SAVE BUTTON */}
            {!loading && (
                <View style={s.footer}>
                    <TouchableOpacity
                        style={[s.saveBtn, saving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        {saving
                            ? <ActivityIndicator color={C.white} />
                            : <Text style={s.saveTxt}>Save Budgets</Text>
                        }
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    header: { paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginTop: 6 },

    scroll: { padding: 16 },

    totalCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: C.card, borderRadius: 18, padding: 20, marginBottom: 24,
        shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3,
    },
    totalLeft: { gap: 4 },
    totalLabel: { fontSize: 11, fontWeight: '600', color: C.sub, letterSpacing: 0.5 },
    totalAmount: { fontSize: 28, fontWeight: '800', color: C.navy },
    totalRight: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.navy + '12', alignItems: 'center', justifyContent: 'center' },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
    sectionSub: { fontSize: 13, color: C.sub, marginBottom: 16 },

    catRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10,
        shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1,
    },
    catIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    catName: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
        borderWidth: 1, borderColor: C.border, minWidth: 110,
    },
    currency: { fontSize: 12, color: C.sub, fontWeight: '600' },
    input: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text, padding: 0 },

    footer: {
        padding: 16, paddingBottom: 32, backgroundColor: C.white,
        borderTopWidth: 1, borderTopColor: C.border,
    },
    saveBtn: {
        backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: C.accent, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6,
    },
    saveTxt: { color: C.white, fontSize: 16, fontWeight: '800' },
});
