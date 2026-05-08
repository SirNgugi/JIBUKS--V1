import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, SafeAreaView, StatusBar, Alert, ActivityIndicator,
    Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '@/services/api';

const C = {
    navy: '#1a3a8f',
    navyDark: '#0e2470',
    gold: '#F59E0B',
    bg: '#F5F7FA',
    white: '#ffffff',
    text: '#1F2937',
    sub: '#6B7280',
    border: '#E5E7EB',
};

function ProgressRing({ pct, size = 64 }: { pct: number; size?: number }) {
    const filled = Math.min(pct, 100) / 100;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                position: 'absolute', width: size, height: size, borderRadius: size / 2,
                borderWidth: 5, borderColor: '#E5E7EB',
            }} />
            <View style={{
                position: 'absolute', width: size, height: size, borderRadius: size / 2,
                borderWidth: 5, borderColor: C.gold, borderRightColor: 'transparent',
                borderBottomColor: filled > 0.5 ? C.gold : 'transparent',
                transform: [{ rotate: `${-90 + filled * 360}deg` }],
                opacity: filled > 0 ? 1 : 0,
            }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.text }}>{Math.round(pct)}%</Text>
        </View>
    );
}

export default function ContributeGroupScreen() {
    const router = useRouter();
    const [family, setFamily] = useState<any>(null);
    const [amount, setAmount] = useState('5000');
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'cash' | 'bank'>('mpesa');
    const [reference, setReference] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadFamily();
    }, []);

    const loadFamily = async () => {
        try {
            const data = await apiService.getFamily();
            setFamily(data);
        } catch (e) {
            console.error('Failed to load family:', e);
        } finally {
            setLoading(false);
        }
    };

    const treasurer = family?.users?.find((u: any) => u.role === 'OWNER' || u.role === 'TREASURER') || family?.users?.[0];

    const groupName = family?.name || 'My Group';
    const groupSaved = family?.totalSaved || 0;
    const groupTarget = family?.savingsTarget || 300000;
    const groupProgress = groupTarget > 0 ? Math.min((groupSaved / groupTarget) * 100, 100) : 0;

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid contribution amount.');
            return;
        }
        try {
            setSubmitting(true);
            await apiService.contributeToGoal(
                family?.id || 0,
                parseFloat(amount),
                reference || `${groupName} contribution`,
            );
            Alert.alert('Success! 🎉', `Your contribution of KES ${parseFloat(amount).toLocaleString()} has been recorded.`, [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            Alert.alert('Error', e?.error || 'Failed to record contribution. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const PAYMENT_METHODS = [
        { key: 'mpesa', label: 'M-PESA', icon: 'phone-portrait-outline' as const },
        { key: 'cash',  label: 'CASH',   icon: 'cash-outline' as const },
        { key: 'bank',  label: 'BANK',   icon: 'business-outline' as const },
    ];

    if (loading) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                    <SafeAreaView>
                        <View style={s.headerRow}>
                            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                                <Ionicons name="arrow-back" size={22} color={C.gold} />
                            </TouchableOpacity>
                            <Text style={s.headerTitle}>Contribute</Text>
                            <View style={{ width: 38 }} />
                        </View>
                    </SafeAreaView>
                </LinearGradient>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={C.navy} />
                </View>
            </View>
        );
    }

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
                        <Text style={s.headerTitle}>Contribute</Text>
                        <View style={{ width: 38 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

                {/* ── GROUP CARD ── */}
                <View style={s.card}>
                    <Text style={s.activeLabel}>ACTIVE GROUP</Text>
                    <View style={s.cardRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.groupName}>{groupName}</Text>
                            <Text style={s.groupFunds}>
                                KES {groupSaved.toLocaleString()} / {groupTarget.toLocaleString()}
                            </Text>
                        </View>
                        <ProgressRing pct={groupProgress} size={72} />
                    </View>
                    <View style={s.progressBar}>
                        <View style={[s.progressFill, { width: `${groupProgress}%` as any }]} />
                    </View>
                </View>

                {/* ── CONTRIBUTION AMOUNT ── */}
                <View style={s.card}>
                    <Text style={s.fieldLabel}>CONTRIBUTION AMOUNT</Text>
                    <View style={s.amountRow}>
                        <Text style={s.amountKes}>KES</Text>
                        <TextInput
                            style={s.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#CBD5E1"
                        />
                    </View>
                </View>

                {/* ── PAYMENT METHOD ── */}
                <View style={s.card}>
                    <Text style={s.fieldLabel}>Payment Method</Text>
                    <View style={s.pmRow}>
                        {PAYMENT_METHODS.map((m) => {
                            const active = paymentMethod === m.key;
                            return (
                                <TouchableOpacity key={m.key} style={[s.pmBtn, active && s.pmBtnActive]}
                                    onPress={() => setPaymentMethod(m.key as any)}>
                                    <Ionicons name={m.icon} size={22} color={active ? C.gold : C.sub} />
                                    <Text style={[s.pmLabel, active && s.pmLabelActive]}>{m.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── SEND TO ── */}
                {treasurer && (
                    <View style={s.card}>
                        <View style={s.sendToHeader}>
                            <Ionicons name="information-circle" size={16} color={C.gold} />
                            <Text style={s.sendToTitle}>Send to</Text>
                        </View>
                        <View style={s.sendToRow}>
                            <View style={s.avatarCircle}>
                                <Ionicons name="person" size={18} color={C.white} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.treasurerName}>{treasurer.name}</Text>
                                <Text style={s.treasurerPhone}>{treasurer.phone || '+254 *** *** ***'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => {
                                if (treasurer.phone) Clipboard.setString(treasurer.phone);
                            }}>
                                <Ionicons name="copy-outline" size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── REFERENCE ── */}
                <View style={s.card}>
                    <Text style={s.fieldLabel}>REFERENCE (OPTIONAL)</Text>
                    <TextInput
                        style={s.refInput}
                        placeholder="e.g., September Contribution"
                        placeholderTextColor="#9CA3AF"
                        value={reference}
                        onChangeText={setReference}
                    />
                </View>

                {/* ── SUBMIT ── */}
                <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : (
                        <Text style={s.submitTxt}>RECORD CONTRIBUTION</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { paddingBottom: 20, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 18, fontWeight: '700' },
    card: { backgroundColor: C.white, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
    cardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    activeLabel: { fontSize: 10, fontWeight: '700', color: C.sub, letterSpacing: 1, marginBottom: 4 },
    groupName: { fontSize: 20, fontWeight: '800', color: C.navy, marginBottom: 4 },
    groupFunds: { fontSize: 13, color: C.sub },
    progressBar: { height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 14, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: C.gold, borderRadius: 3 },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: C.sub, letterSpacing: 0.5, marginBottom: 10 },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
    amountKes: { fontSize: 20, fontWeight: '600', color: C.sub },
    amountInput: { flex: 1, fontSize: 38, fontWeight: '800', color: C.navy },
    pmRow: { flexDirection: 'row', gap: 10 },
    pmBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, gap: 4 },
    pmBtnActive: { borderColor: C.gold, backgroundColor: '#FFFBEB' },
    pmLabel: { fontSize: 11, fontWeight: '600', color: C.sub },
    pmLabelActive: { color: C.gold },
    sendToHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    sendToTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    sendToRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
    treasurerName: { fontSize: 15, fontWeight: '700', color: C.text },
    treasurerPhone: { fontSize: 13, color: C.sub, marginTop: 2 },
    refInput: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, fontSize: 14, color: C.text },
    submitBtn: { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
    submitTxt: { color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
