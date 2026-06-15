import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, SafeAreaView, StatusBar, ActivityIndicator, Alert,
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

const FROM_ACCOUNTS = [
    { id: 1, name: 'M-Pesa',        sub: 'Personal Account', icon: 'phone-portrait', color: '#22C55E' },
    { id: 2, name: 'Bank Account',  sub: 'KCB / Equity',     icon: 'business',       color: '#3B82F6' },
    { id: 3, name: 'Cash',          sub: 'Physical cash',    icon: 'cash',           color: '#F59E0B' },
];

const TO_ACCOUNTS = [
    { id: 1, name: 'JiBUKS Wallet', sub: 'Savings Account', icon: 'wallet',  color: '#1a3a8f' },
    { id: 2, name: 'Savings Goal',  sub: 'Personal goal',   icon: 'flag',    color: '#F59E0B' },
    { id: 3, name: 'Family Member', sub: 'Send to member',  icon: 'people',  color: '#8B5CF6' },
];

const AVATAR_COLORS = ['#F59E0B', '#3B82F6', '#22C55E', '#EF4444', '#8B5CF6'];

export default function TransferScreen() {
    const router = useRouter();

    const [rawAmount, setRawAmount]         = useState('');
    const [note, setNote]                   = useState('');
    const [fromIdx, setFromIdx]             = useState(0);
    const [toIdx, setToIdx]                 = useState(0);
    const [showFromDrop, setShowFromDrop]   = useState(false);
    const [showToDrop, setShowToDrop]       = useState(false);
    const [balance, setBalance]             = useState(0);
    const [members, setMembers]             = useState<any[]>([]);
    const [loading, setLoading]             = useState(false);

    useEffect(() => {
        apiService.getDashboard().then((d: any) => {
            if (d?.summary?.balance) setBalance(d.summary.balance);
        }).catch(() => {});
        apiService.getFamily().then((f: any) => {
            if (f?.users) setMembers(f.users.slice(0, 2));
        }).catch(() => {});
    }, []);

    const displayAmount = rawAmount ? Number(rawAmount).toLocaleString() : '0.00';
    const fromAcc = FROM_ACCOUNTS[fromIdx];
    const toAcc   = TO_ACCOUNTS[toIdx];

    const swapAccounts = () => {
        const newFrom = toIdx % FROM_ACCOUNTS.length;
        const newTo   = fromIdx % TO_ACCOUNTS.length;
        setFromIdx(newFrom);
        setToIdx(newTo);
    };

    const handleTransfer = async () => {
        const amt = parseFloat(rawAmount);
        if (!rawAmount || isNaN(amt) || amt <= 0) {
            Alert.alert('Invalid Amount', 'Please enter an amount to transfer.');
            return;
        }
        setLoading(true);
        try {
            await apiService.createTransaction({
                type: 'EXPENSE',
                amount: amt,
                category: 'Transfer',
                description: note || `Transfer: ${fromAcc.name} → ${toAcc.name}`,
                date: new Date().toISOString(),
                paymentMethod: fromAcc.name,
            });
            Alert.alert('Success', 'Transfer recorded successfully!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            Alert.alert('Error', e?.error || e?.message || 'Transfer failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* ── HEADER ── */}
            <LinearGradient colors={[C.navy, C.navyDark]} style={s.header}>
                <View style={s.headerRow}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={C.gold} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>Transfer</Text>
                        <View style={{ width: 38 }} />
                    </View>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
                keyboardShouldPersistTaps="handled">

                {/* ── AMOUNT ── */}
                <View style={s.amountSection}>
                    <Text style={s.amountLabel}>ENTER AMOUNT</Text>
                    <View style={s.amountRow}>
                        <Text style={s.kes}>KES</Text>
                        <TextInput
                            style={s.amountInput}
                            value={rawAmount}
                            onChangeText={t => setRawAmount(t.replace(/[^0-9.]/g, ''))}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#CBD5E1"
                        />
                    </View>
                    <View style={s.balanceBadge}>
                        <Text style={s.balanceTxt}>
                            BALANCE: KES {balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </Text>
                    </View>
                </View>

                {/* ── FROM ACCOUNT ── */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionLabel}>FROM ACCOUNT</Text>
                        <Ionicons name="card-outline" size={18} color={C.sub} />
                    </View>
                    <TouchableOpacity style={s.accountCard}
                        onPress={() => { setShowFromDrop(!showFromDrop); setShowToDrop(false); }}
                        activeOpacity={0.8}>
                        <View style={[s.accIcon, { backgroundColor: fromAcc.color + '20' }]}>
                            <Ionicons name={fromAcc.icon as any} size={22} color={fromAcc.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.accName}>{fromAcc.name}</Text>
                            <Text style={s.accSub}>{fromAcc.sub}</Text>
                        </View>
                        <Ionicons name="chevron-down" size={18} color={C.sub} />
                    </TouchableOpacity>
                    {showFromDrop && (
                        <View style={s.dropdown}>
                            {FROM_ACCOUNTS.map((acc, i) => (
                                <TouchableOpacity key={acc.id} style={s.dropItem}
                                    onPress={() => { setFromIdx(i); setShowFromDrop(false); }}>
                                    <Ionicons name={acc.icon as any} size={18} color={acc.color} />
                                    <Text style={s.dropTxt}>{acc.name}</Text>
                                    {i === fromIdx && <Ionicons name="checkmark" size={16} color={C.gold} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── SWAP BUTTON ── */}
                <View style={s.swapRow}>
                    <TouchableOpacity style={s.swapBtn} onPress={swapAccounts} activeOpacity={0.85}>
                        <Ionicons name="arrow-down" size={22} color={C.white} />
                    </TouchableOpacity>
                </View>

                {/* ── TO ACCOUNT ── */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionLabel}>TO ACCOUNT</Text>
                        <Ionicons name="person-add-outline" size={18} color={C.sub} />
                    </View>
                    <TouchableOpacity style={s.accountCard}
                        onPress={() => { setShowToDrop(!showToDrop); setShowFromDrop(false); }}
                        activeOpacity={0.8}>
                        <View style={[s.accIcon, { backgroundColor: toAcc.color + '20' }]}>
                            <Ionicons name={toAcc.icon as any} size={22} color={toAcc.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.accName}>{toAcc.name}</Text>
                            <Text style={s.accSub}>{toAcc.sub}</Text>
                        </View>
                        <Ionicons name="chevron-down" size={18} color={C.sub} />
                    </TouchableOpacity>
                    {showToDrop && (
                        <View style={s.dropdown}>
                            {TO_ACCOUNTS.map((acc, i) => (
                                <TouchableOpacity key={acc.id} style={s.dropItem}
                                    onPress={() => { setToIdx(i); setShowToDrop(false); }}>
                                    <Ionicons name={acc.icon as any} size={18} color={acc.color} />
                                    <Text style={s.dropTxt}>{acc.name}</Text>
                                    {i === toIdx && <Ionicons name="checkmark" size={16} color={C.gold} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── NOTE ── */}
                <View style={s.noteCard}>
                    <Ionicons name="reorder-three-outline" size={20} color={C.sub} />
                    <TextInput
                        style={s.noteInput}
                        placeholder="Add a note (Optional)"
                        placeholderTextColor={C.sub}
                        value={note}
                        onChangeText={setNote}
                    />
                </View>

                {/* ── RECENT RECIPIENTS ── */}
                <View style={s.recipientsSection}>
                    <Text style={s.recipientsLabel}>RECENT RECIPIENTS</Text>
                    <View style={s.recipientsRow}>
                        {members.map((m, i) => (
                            <TouchableOpacity key={m.id} style={s.recipientItem} activeOpacity={0.8}>
                                <View style={[s.recipientAvatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                                    <Text style={s.recipientInitial}>{m.name?.[0]?.toUpperCase() || '?'}</Text>
                                </View>
                                <Text style={s.recipientName}>{m.name?.split(' ')[0]}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={s.recipientItem} activeOpacity={0.8}
                            onPress={() => router.push('/add-family-member' as any)}>
                            <View style={[s.recipientAvatar, { backgroundColor: '#E5E7EB' }]}>
                                <Ionicons name="add" size={22} color={C.sub} />
                            </View>
                            <Text style={s.recipientName}>New</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 24 }} />
            </ScrollView>

            {/* ── TRANSFER BUTTON ── */}
            <View style={s.footer}>
                <TouchableOpacity style={[s.transferBtn, loading && { opacity: 0.7 }]}
                    onPress={handleTransfer} disabled={loading} activeOpacity={0.85}>
                    {loading
                        ? <ActivityIndicator color={C.white} />
                        : <>
                            <Text style={s.transferBtnTxt}>
                                Transfer KES {rawAmount ? Number(rawAmount).toLocaleString() : '0.00'}
                            </Text>
                            <Ionicons name="send" size={18} color={C.white} />
                          </>
                    }
                </TouchableOpacity>
                <Text style={s.poweredBy}>Powered by Apbc 🌍</Text>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root:        { flex: 1, backgroundColor: C.bg },
    header:      { paddingBottom: 20, paddingHorizontal: 20 },
    headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: C.gold, fontSize: 18, fontWeight: '700' },

    scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },

    amountSection: { alignItems: 'center', marginBottom: 28 },
    amountLabel:   { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 1, marginBottom: 8 },
    amountRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    kes:           { fontSize: 22, fontWeight: '700', color: C.navy, marginBottom: 6 },
    amountInput:   { fontSize: 52, fontWeight: '700', color: C.navy, minWidth: 160, textAlign: 'center' },
    balanceBadge:  { backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginTop: 12 },
    balanceTxt:    { fontSize: 12, fontWeight: '700', color: '#92400E' },

    section:       { marginBottom: 4 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionLabel:  { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.8 },

    accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    accIcon:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    accName:     { fontSize: 15, fontWeight: '700', color: C.text },
    accSub:      { fontSize: 12, color: C.sub, marginTop: 1 },

    dropdown:  { backgroundColor: C.white, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    dropItem:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    dropTxt:   { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },

    swapRow: { alignItems: 'center', marginVertical: 14 },
    swapBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', shadowColor: C.gold, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 4 },

    noteCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    noteInput: { flex: 1, fontSize: 15, color: C.text },

    recipientsSection: { marginTop: 24 },
    recipientsLabel:   { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.8, marginBottom: 14 },
    recipientsRow:     { flexDirection: 'row', gap: 20 },
    recipientItem:     { alignItems: 'center', gap: 6 },
    recipientAvatar:   { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
    recipientInitial:  { fontSize: 20, fontWeight: '700', color: C.white },
    recipientName:     { fontSize: 12, color: C.text, fontWeight: '600' },

    footer:       { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 12, backgroundColor: C.bg },
    transferBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.gold, borderRadius: 30, paddingVertical: 17, shadowColor: C.gold, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5 },
    transferBtnTxt: { fontSize: 16, fontWeight: '700', color: C.white },
    poweredBy:    { textAlign: 'center', fontSize: 11, color: C.sub, marginTop: 10 },
});
