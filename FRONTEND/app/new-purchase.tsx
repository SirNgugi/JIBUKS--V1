import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '@/services/api';

export default function NewPurchaseScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [accounts, setAccounts] = useState([]);

    // Form state
    const [vendorId, setVendorId] = useState('');
    const [billNumber, setBillNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([
        { description: '', quantity: '', unitPrice: '', accountId: '' }
    ]);
    const [tax, setTax] = useState('0');
    const [discount, setDiscount] = useState('0');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [vendorsData, accountsData] = await Promise.all([
                apiService.request('/vendors'),
                apiService.request('/accounts')
            ]);
            setVendors(vendorsData);
            // Filter for expense accounts
            setAccounts(accountsData.filter(a => a.type === 'EXPENSE' || a.type === 'ASSET'));
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load vendors and accounts');
        }
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: '', unitPrice: '', accountId: '' }]);
    };

    const removeItem = (index) => {
        if (items.length === 1) {
            Alert.alert('Error', 'At least one item is required');
            return;
        }
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const calculateSubtotal = () => {
        return items.reduce((sum, item) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const taxAmount = parseFloat(tax) || 0;
        const discountAmount = parseFloat(discount) || 0;
        return subtotal + taxAmount - discountAmount;
    };

    const handleSubmit = async () => {
        // Validation
        if (!vendorId) {
            Alert.alert('Error', 'Please select a vendor');
            return;
        }

        const validItems = items.filter(item =>
            item.description && item.quantity && item.unitPrice && item.accountId
        );

        if (validItems.length === 0) {
            Alert.alert('Error', 'Please add at least one valid item');
            return;
        }

        try {
            setLoading(true);

            const purchaseData = {
                vendorId: parseInt(vendorId),
                billNumber: billNumber || undefined,
                purchaseDate,
                dueDate: dueDate || undefined,
                items: validItems.map(item => ({
                    description: item.description,
                    quantity: parseFloat(item.quantity),
                    unitPrice: parseFloat(item.unitPrice),
                    accountId: parseInt(item.accountId)
                })),
                tax: parseFloat(tax) || 0,
                discount: parseFloat(discount) || 0,
                notes: notes || undefined,
                status: 'UNPAID'
            };

            await apiService.request('/purchases', {
                method: 'POST',
                body: JSON.stringify(purchaseData)
            });

            Alert.alert('Success', 'Purchase created successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error creating purchase:', error);
            Alert.alert('Error', error.error || 'Failed to create purchase');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Purchase</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Vendor Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vendor Information</Text>

                    <Text style={styles.label}>Vendor *</Text>
                    <View style={styles.pickerContainer}>
                        <Ionicons name="person-outline" size={20} color="#6b7280" />
                        <select
                            value={vendorId}
                            onChange={(e) => setVendorId(e.target.value)}
                            style={styles.picker}
                        >
                            <option value="">Select Vendor</option>
                            {vendors.map(vendor => (
                                <option key={vendor.id} value={vendor.id}>
                                    {vendor.name}
                                </option>
                            ))}
                        </select>
                    </View>

                    <Text style={styles.label}>Bill Number</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="document-text-outline" size={20} color="#6b7280" />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter bill number"
                            value={billNumber}
                            onChangeText={setBillNumber}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Purchase Date *</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                                <TextInput
                                    style={styles.input}
                                    value={purchaseDate}
                                    onChangeText={setPurchaseDate}
                                    placeholder="YYYY-MM-DD"
                                />
                            </View>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Due Date</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                                <TextInput
                                    style={styles.input}
                                    value={dueDate}
                                    onChangeText={setDueDate}
                                    placeholder="YYYY-MM-DD"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Line Items */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Items</Text>
                        <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
                            <Ionicons name="add" size={20} color="#2563eb" />
                            <Text style={styles.addItemText}>Add Item</Text>
                        </TouchableOpacity>
                    </View>

                    {items.map((item, index) => (
                        <View key={index} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemNumber}>Item {index + 1}</Text>
                                {items.length > 1 && (
                                    <TouchableOpacity onPress={() => removeItem(index)}>
                                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <Text style={styles.label}>Description *</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Item description"
                                value={item.description}
                                onChangeText={(value) => updateItem(index, 'description', value)}
                                multiline
                                numberOfLines={2}
                            />

                            <Text style={styles.label}>Account *</Text>
                            <View style={styles.pickerContainer}>
                                <Ionicons name="folder-outline" size={20} color="#6b7280" />
                                <select
                                    value={item.accountId}
                                    onChange={(e) => updateItem(index, 'accountId', e.target.value)}
                                    style={styles.picker}
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.code} - {account.name}
                                        </option>
                                    ))}
                                </select>
                            </View>

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.label}>Quantity *</Text>
                                    <TextInput
                                        style={styles.inputSmall}
                                        placeholder="0"
                                        value={item.quantity}
                                        onChangeText={(value) => updateItem(index, 'quantity', value)}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.label}>Unit Price *</Text>
                                    <TextInput
                                        style={styles.inputSmall}
                                        placeholder="0.00"
                                        value={item.unitPrice}
                                        onChangeText={(value) => updateItem(index, 'unitPrice', value)}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            <View style={styles.itemTotal}>
                                <Text style={styles.itemTotalLabel}>Amount:</Text>
                                <Text style={styles.itemTotalValue}>
                                    KES {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Totals</Text>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Tax</Text>
                            <TextInput
                                style={styles.inputSmall}
                                placeholder="0.00"
                                value={tax}
                                onChangeText={setTax}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Discount</Text>
                            <TextInput
                                style={styles.inputSmall}
                                placeholder="0.00"
                                value={discount}
                                onChangeText={setDiscount}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.totalCard}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal:</Text>
                            <Text style={styles.totalValue}>KES {calculateSubtotal().toLocaleString()}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Tax:</Text>
                            <Text style={styles.totalValue}>KES {(parseFloat(tax) || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Discount:</Text>
                            <Text style={styles.totalValue}>- KES {(parseFloat(discount) || 0).toLocaleString()}</Text>
                        </View>
                        <View style={[styles.totalRow, styles.grandTotal]}>
                            <Text style={styles.grandTotalLabel}>Total:</Text>
                            <Text style={styles.grandTotalValue}>KES {calculateTotal().toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Notes */}
                <View style={styles.section}>
                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Additional notes..."
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={24} color="#fff" />
                            <Text style={styles.submitButtonText}>Create Purchase</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    scrollView: {
        flex: 1,
    },
    section: {
        padding: 16,
        backgroundColor: '#fff',
        marginBottom: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginTop: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 12,
        height: 48,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1f2937',
        outlineStyle: 'none',
    },
    inputSmall: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 12,
        height: 48,
        fontSize: 16,
        color: '#1f2937',
        outlineStyle: 'none',
    },
    textArea: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        minHeight: 80,
        textAlignVertical: 'top',
        outlineStyle: 'none',
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 12,
        height: 48,
    },
    picker: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1f2937',
        backgroundColor: 'transparent',
        border: 'none',
        outlineStyle: 'none',
    },
    row: {
        flexDirection: 'row',
    },
    addItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#eff6ff',
    },
    addItemText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
        color: '#2563eb',
    },
    itemCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    itemNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563eb',
    },
    itemTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    itemTotalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    itemTotalValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    totalCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    totalValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    grandTotal: {
        borderTopWidth: 2,
        borderTopColor: '#e5e7eb',
        paddingTop: 12,
        marginTop: 8,
    },
    grandTotalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    grandTotalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        marginHorizontal: 16,
        marginTop: 16,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});
