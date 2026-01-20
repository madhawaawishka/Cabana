import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Platform, TextInput, Modal } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase, Invoice, Booking, Property, InvoiceCustomField } from '../../lib/supabase';

export default function InvoiceScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    // Custom fields state
    const [customFields, setCustomFields] = useState<InvoiceCustomField[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldAmount, setNewFieldAmount] = useState('');
    const [newFieldType, setNewFieldType] = useState<'add' | 'subtract'>('add');

    const fetchData = async () => {
        if (!id) return;

        // Fetch invoice
        const { data: invoiceData } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', id)
            .single();

        if (invoiceData) {
            setInvoice(invoiceData);
            setCustomFields(invoiceData.custom_fields || []);

            // Fetch booking
            const { data: bookingData } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', invoiceData.booking_id)
                .single();

            if (bookingData) {
                setBooking(bookingData);

                // Fetch property
                const { data: propData } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('id', bookingData.property_id)
                    .single();

                if (propData) {
                    setProperty(propData);
                }
            }
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const getDaysBetween = (start: string, end: string): number => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    // Calculate total with custom fields
    const calculateTotal = (): number => {
        if (!invoice) return 0;

        const baseAmount = invoice.amount || 0;
        let total = baseAmount;

        customFields.forEach(field => {
            if (field.type === 'add') {
                total += field.amount;
            } else {
                total -= field.amount;
            }
        });

        return Math.max(0, total); // Ensure total doesn't go negative
    };

    // Add a new custom field
    const handleAddField = async () => {
        if (!newFieldName.trim()) {
            Alert.alert('Error', 'Please enter a field name');
            return;
        }

        const amount = parseFloat(newFieldAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        const newField: InvoiceCustomField = {
            id: Date.now().toString(),
            name: newFieldName.trim(),
            amount: amount,
            type: newFieldType,
        };

        const updatedFields = [...customFields, newField];
        await saveCustomFields(updatedFields);

        // Reset form
        setNewFieldName('');
        setNewFieldAmount('');
        setNewFieldType('add');
        setShowAddModal(false);
    };

    // Delete a custom field
    const handleDeleteField = async (fieldId: string) => {
        Alert.alert(
            'Delete Item',
            'Are you sure you want to remove this item?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const updatedFields = customFields.filter(f => f.id !== fieldId);
                        await saveCustomFields(updatedFields);
                    },
                },
            ]
        );
    };

    // Save custom fields to Supabase
    const saveCustomFields = async (fields: InvoiceCustomField[]) => {
        if (!invoice) return;

        const newTotal = calculateTotalWithFields(fields);

        const { error } = await supabase
            .from('invoices')
            .update({
                custom_fields: fields,
                total: newTotal,
            })
            .eq('id', invoice.id);

        if (error) {
            console.error('Error saving custom fields:', error);
            Alert.alert('Error', 'Failed to save changes');
        } else {
            setCustomFields(fields);
            setInvoice({ ...invoice, custom_fields: fields, total: newTotal });
        }
    };

    // Calculate total with specific fields array
    const calculateTotalWithFields = (fields: InvoiceCustomField[]): number => {
        if (!invoice) return 0;

        const baseAmount = invoice.amount || 0;
        let total = baseAmount;

        fields.forEach(field => {
            if (field.type === 'add') {
                total += field.amount;
            } else {
                total -= field.amount;
            }
        });

        return Math.max(0, total);
    };

    const generateInvoiceHTML = () => {
        if (!invoice || !booking || !property) return '';

        const currentTotal = calculateTotal();

        // Generate custom fields rows
        const customFieldsHTML = customFields.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <th style="background: #F3F4F6; padding: 12px; text-align: left;">Item</th>
                    <th style="background: #F3F4F6; padding: 12px; text-align: right;">Amount</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">Base Amount (${getDaysBetween(booking.check_in_date, booking.check_out_date)} nights)</td>
                    <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">$${invoice.amount}</td>
                </tr>
                ${customFields.map(field => `
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${field.name}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right; color: ${field.type === 'subtract' ? '#DC2626' : '#059669'};">
                            ${field.type === 'subtract' ? '-' : '+'}$${field.amount.toFixed(2)}
                        </td>
                    </tr>
                `).join('')}
                <tr style="background: #4F46E5; color: white;">
                    <td style="padding: 12px; font-weight: bold; font-size: 18px;">Total Amount</td>
                    <td style="padding: 12px; font-weight: bold; font-size: 18px; text-align: right;">$${currentTotal.toFixed(2)}</td>
                </tr>
            </table>
        ` : `
            <div style="font-size: 24px; font-weight: bold; color: #4F46E5; text-align: right; margin-top: 20px;">
                Total: $${currentTotal.toFixed(2)}
            </div>
        `;

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1F2937; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: bold; color: #4F46E5; }
          .invoice-number { color: #4F46E5; font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🏨 Villa Booking</div>
          <div class="invoice-number">Invoice #${invoice.invoice_number}</div>
        </div>
        <p><strong>Guest:</strong> ${booking.customer_name}</p>
        <p><strong>Property:</strong> ${property.name}</p>
        <p><strong>Dates:</strong> ${new Date(booking.check_in_date).toLocaleDateString()} - ${new Date(booking.check_out_date).toLocaleDateString()} (${getDaysBetween(booking.check_in_date, booking.check_out_date)} nights)</p>
        ${customFieldsHTML}
      </body>
      </html>
    `;
    };

    const handlePrint = async () => {
        if (!invoice || !booking || !property) return;

        const html = generateInvoiceHTML();
        await Print.printAsync({ html });
    };

    const handleGeneralShare = async () => {
        if (!invoice?.pdf_url) {
            Alert.alert('Error', 'Invoice file not available');
            return;
        }

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(invoice.pdf_url, {
                mimeType: 'application/pdf',
                dialogTitle: `Share Invoice ${invoice.invoice_number}`,
            });
        } else {
            Alert.alert('Error', 'Sharing is not available on this device');
        }
    };

    const handleWhatsAppShare = async () => {
        if (!invoice || !booking) return;

        const currentTotal = calculateTotal();

        // Build custom fields message
        let customFieldsMessage = '';
        if (customFields.length > 0) {
            customFieldsMessage = '\n\n📋 *Breakdown:*\n' +
                `   Base Amount: $${invoice.amount}\n` +
                customFields.map(field =>
                    `   ${field.type === 'add' ? '➕' : '➖'} ${field.name}: ${field.type === 'subtract' ? '-' : '+'}$${field.amount.toFixed(2)}`
                ).join('\n');
        }

        // Create invoice message
        const message = `🧾 *Invoice ${invoice.invoice_number}*\n\n` +
            `👤 Guest: ${booking.customer_name}\n` +
            `🏨 Property: ${property?.name || 'N/A'}\n` +
            `📅 Check-in: ${new Date(booking.check_in_date).toLocaleDateString()}\n` +
            `📅 Check-out: ${new Date(booking.check_out_date).toLocaleDateString()}\n` +
            `🌙 Nights: ${booking ? getDaysBetween(booking.check_in_date, booking.check_out_date) : 0}` +
            customFieldsMessage +
            `\n\n💰 *Total: $${currentTotal.toFixed(2)}*\n` +
            `✅ Status: ${booking.is_paid ? 'Paid' : 'Pending'}\n\n` +
            `Thank you for choosing Villa Booking! 🏠`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;

        try {
            const canOpen = await Linking.canOpenURL(whatsappUrl);
            if (canOpen) {
                await Linking.openURL(whatsappUrl);
            } else {
                // Try web WhatsApp if app is not installed
                const webWhatsApp = `https://wa.me/?text=${encodedMessage}`;
                await Linking.openURL(webWhatsApp);
            }
        } catch (error) {
            Alert.alert('Error', 'Unable to open WhatsApp. Please make sure it is installed.');
        }
    };

    const handleEmailShare = async () => {
        if (!invoice || !booking) return;

        const currentTotal = calculateTotal();

        // Build custom fields message
        let customFieldsText = '';
        if (customFields.length > 0) {
            customFieldsText = '\n\nBreakdown:\n' +
                `  Base Amount: $${invoice.amount}\n` +
                customFields.map(field =>
                    `  ${field.name}: ${field.type === 'subtract' ? '-' : '+'}$${field.amount.toFixed(2)}`
                ).join('\n');
        }

        const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} - Villa Booking`);
        const body = encodeURIComponent(
            `Invoice ${invoice.invoice_number}\n\n` +
            `Guest: ${booking.customer_name}\n` +
            `Property: ${property?.name || 'N/A'}\n` +
            `Check-in: ${new Date(booking.check_in_date).toLocaleDateString()}\n` +
            `Check-out: ${new Date(booking.check_out_date).toLocaleDateString()}\n` +
            `Nights: ${booking ? getDaysBetween(booking.check_in_date, booking.check_out_date) : 0}` +
            customFieldsText +
            `\n\nTotal: $${currentTotal.toFixed(2)}\n` +
            `Status: ${booking.is_paid ? 'Paid' : 'Pending'}\n\n` +
            `Thank you for choosing Villa Booking!`
        );

        const emailUrl = `mailto:${booking.customer_email || ''}?subject=${subject}&body=${body}`;

        try {
            await Linking.openURL(emailUrl);
        } catch (error) {
            Alert.alert('Error', 'Unable to open email app.');
        }
    };

    const handleSavePDF = async () => {
        if (!invoice?.pdf_url) {
            Alert.alert('Error', 'Invoice file not available');
            return;
        }

        // Use sharing to "save" - on iOS this allows saving to Files, on Android to local storage
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(invoice.pdf_url, {
                mimeType: 'application/pdf',
                dialogTitle: `Save Invoice ${invoice.invoice_number}`,
            });
        } else {
            Alert.alert('Info', `Invoice saved at: ${invoice.pdf_url}`);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <Text className="text-gray-500">Loading...</Text>
            </View>
        );
    }

    if (!invoice || !booking) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <Text className="text-gray-500">Invoice not found</Text>
            </View>
        );
    }

    const currentTotal = calculateTotal();

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Invoice',
                    headerShown: true,
                }}
            />
            <ScrollView className="flex-1 bg-gray-50">
                <View className="p-4">
                    {/* Invoice Header */}
                    <View className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 mb-4" style={{ backgroundColor: '#4F46E5' }}>
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-white text-3xl">🧾</Text>
                            <View className="bg-white/20 px-3 py-1 rounded-full">
                                <Text className="text-white font-bold">{booking.is_paid ? '✓ Paid' : '⚠ Pending'}</Text>
                            </View>
                        </View>
                        <Text className="text-white text-xl font-bold">Invoice</Text>
                        <Text className="text-white/80 text-lg">{invoice.invoice_number}</Text>
                    </View>

                    {/* Invoice Card */}
                    <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
                        <View className="border-b border-gray-100 pb-4 mb-4">
                            <Text className="text-gray-500 text-sm">Bill To</Text>
                            <Text className="text-xl font-bold text-gray-800">{booking.customer_name}</Text>
                            {booking.customer_email && (
                                <Text className="text-gray-600">{booking.customer_email}</Text>
                            )}
                            {booking.customer_phone && (
                                <Text className="text-gray-600">{booking.customer_phone}</Text>
                            )}
                        </View>

                        <View className="border-b border-gray-100 pb-4 mb-4">
                            <Text className="text-gray-500 text-sm">Property</Text>
                            <Text className="text-lg font-bold text-gray-800">{property?.name}</Text>
                        </View>

                        <View className="flex-row justify-between mb-4">
                            <View className="flex-1">
                                <Text className="text-gray-500 text-sm">Check-in</Text>
                                <Text className="font-bold text-gray-800">
                                    {new Date(booking.check_in_date).toLocaleDateString()}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-500 text-sm">Check-out</Text>
                                <Text className="font-bold text-gray-800">
                                    {new Date(booking.check_out_date).toLocaleDateString()}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-500 text-sm">Nights</Text>
                                <Text className="font-bold text-gray-800">
                                    {getDaysBetween(booking.check_in_date, booking.check_out_date)}
                                </Text>
                            </View>
                        </View>

                        {/* Base Amount */}
                        <View className="border-t border-gray-100 pt-4">
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-gray-600">Base Amount</Text>
                                <Text className="text-gray-800 font-semibold">${invoice.amount}</Text>
                            </View>

                            {/* Custom Fields List */}
                            {customFields.map((field) => (
                                <View key={field.id} className="flex-row items-center justify-between mb-2">
                                    <View className="flex-row items-center flex-1">
                                        <Text className="text-gray-600">{field.name}</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Text
                                            className="font-semibold mr-3"
                                            style={{ color: field.type === 'subtract' ? '#DC2626' : '#059669' }}
                                        >
                                            {field.type === 'subtract' ? '-' : '+'}${field.amount.toFixed(2)}
                                        </Text>
                                        <TouchableOpacity onPress={() => handleDeleteField(field.id)}>
                                            <Text className="text-red-500 text-lg">🗑️</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {/* Add Item Button */}
                            <TouchableOpacity
                                className="flex-row items-center justify-center py-3 mt-2 rounded-xl border-2 border-dashed"
                                style={{ borderColor: '#4F46E5' }}
                                onPress={() => setShowAddModal(true)}
                            >
                                <Text style={{ color: '#4F46E5' }} className="font-bold">+ Add Item</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Total Amount */}
                        <View className="bg-primary-50 rounded-xl p-4 mt-4" style={{ backgroundColor: '#EEF2FF' }}>
                            <View className="flex-row items-center justify-between">
                                <Text className="text-primary-800 font-bold text-lg" style={{ color: '#3730A3' }}>Total Amount</Text>
                                <Text className="text-primary-600 font-bold text-2xl" style={{ color: '#4F46E5' }}>
                                    ${currentTotal.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Share Options Section */}
                    <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                        <Text className="text-lg font-bold text-gray-800 mb-4">Share Invoice</Text>

                        {/* Primary sharing options row */}
                        <View className="flex-row gap-3 mb-3">
                            <TouchableOpacity
                                className="flex-1 py-4 rounded-xl items-center"
                                style={{ backgroundColor: '#25D366' }}
                                onPress={handleWhatsAppShare}
                            >
                                <Text className="text-white text-2xl mb-1">💬</Text>
                                <Text className="text-white font-bold">WhatsApp</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-4 rounded-xl items-center"
                                style={{ backgroundColor: '#EA4335' }}
                                onPress={handleEmailShare}
                            >
                                <Text className="text-white text-2xl mb-1">✉️</Text>
                                <Text className="text-white font-bold">Email</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Secondary sharing options row */}
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 py-4 rounded-xl items-center"
                                style={{ backgroundColor: '#4F46E5' }}
                                onPress={handlePrint}
                            >
                                <Text className="text-white text-2xl mb-1">🖨️</Text>
                                <Text className="text-white font-bold">Print</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-4 rounded-xl items-center"
                                style={{ backgroundColor: '#10B981' }}
                                onPress={handleGeneralShare}
                            >
                                <Text className="text-white text-2xl mb-1">📤</Text>
                                <Text className="text-white font-bold">More</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Save PDF Button */}
                    <TouchableOpacity
                        className="py-4 rounded-xl items-center mb-4 border-2"
                        style={{ borderColor: '#4F46E5', backgroundColor: 'transparent' }}
                        onPress={handleSavePDF}
                    >
                        <Text className="font-bold" style={{ color: '#4F46E5' }}>💾 Save PDF to Device</Text>
                    </TouchableOpacity>

                    {/* Invoice Date */}
                    <Text className="text-gray-400 text-center mb-8">
                        Generated on {new Date(invoice.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </ScrollView>

            {/* Add Custom Field Modal */}
            <Modal
                visible={showAddModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View className="bg-white rounded-t-3xl p-6">
                        <Text className="text-xl font-bold text-gray-800 mb-4">Add Invoice Item</Text>

                        {/* Field Name */}
                        <Text className="text-gray-600 mb-2">Item Name</Text>
                        <TextInput
                            className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800 mb-4"
                            placeholder="e.g., Beverages, Discount, Room Service"
                            value={newFieldName}
                            onChangeText={setNewFieldName}
                        />

                        {/* Amount */}
                        <Text className="text-gray-600 mb-2">Amount</Text>
                        <TextInput
                            className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800 mb-4"
                            placeholder="0.00"
                            value={newFieldAmount}
                            onChangeText={setNewFieldAmount}
                            keyboardType="decimal-pad"
                        />

                        {/* Type Selection */}
                        <Text className="text-gray-600 mb-2">Type</Text>
                        <View className="flex-row gap-3 mb-6">
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl items-center border-2"
                                style={{
                                    borderColor: newFieldType === 'add' ? '#059669' : '#E5E7EB',
                                    backgroundColor: newFieldType === 'add' ? '#ECFDF5' : 'white'
                                }}
                                onPress={() => setNewFieldType('add')}
                            >
                                <Text style={{ color: newFieldType === 'add' ? '#059669' : '#6B7280' }} className="font-bold">
                                    ➕ Add to Total
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl items-center border-2"
                                style={{
                                    borderColor: newFieldType === 'subtract' ? '#DC2626' : '#E5E7EB',
                                    backgroundColor: newFieldType === 'subtract' ? '#FEF2F2' : 'white'
                                }}
                                onPress={() => setNewFieldType('subtract')}
                            >
                                <Text style={{ color: newFieldType === 'subtract' ? '#DC2626' : '#6B7280' }} className="font-bold">
                                    ➖ Subtract
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 py-4 rounded-xl items-center bg-gray-200"
                                onPress={() => {
                                    setShowAddModal(false);
                                    setNewFieldName('');
                                    setNewFieldAmount('');
                                    setNewFieldType('add');
                                }}
                            >
                                <Text className="font-bold text-gray-600">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-4 rounded-xl items-center"
                                style={{ backgroundColor: '#4F46E5' }}
                                onPress={handleAddField}
                            >
                                <Text className="font-bold text-white">Add Item</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}
