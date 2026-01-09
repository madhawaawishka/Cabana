import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase, Booking, Property, Invoice } from '../../lib/supabase';

export default function BookingDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [property, setProperty] = useState<Property | null>(null);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editedAmount, setEditedAmount] = useState('');
    const [editedPaid, setEditedPaid] = useState(false);

    const fetchData = async () => {
        if (!id) return;

        // Fetch booking
        const { data: bookingData, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', id)
            .single();

        if (bookingData && !error) {
            setBooking(bookingData);
            setEditedAmount(bookingData.total_amount?.toString() || '');
            setEditedPaid(bookingData.is_paid);

            // Fetch property
            const { data: propData } = await supabase
                .from('properties')
                .select('*')
                .eq('id', bookingData.property_id)
                .single();

            if (propData) {
                setProperty(propData);
            }

            // Fetch invoice if exists
            const { data: invoiceData } = await supabase
                .from('invoices')
                .select('*')
                .eq('booking_id', id)
                .single();

            if (invoiceData) {
                setInvoice(invoiceData);
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

    const handleUpdate = async () => {
        if (!booking) return;

        const { error } = await supabase
            .from('bookings')
            .update({
                total_amount: editedAmount ? parseFloat(editedAmount) : null,
                is_paid: editedPaid,
            })
            .eq('id', booking.id);

        if (error) {
            Alert.alert('Error', 'Failed to update booking');
        } else {
            setEditing(false);
            fetchData();
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Booking',
            'Are you sure you want to delete this booking?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.from('bookings').delete().eq('id', id);
                        router.back();
                    },
                },
            ]
        );
    };

    const generateInvoice = async () => {
        if (!booking || !property) return;

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

        // Create HTML for invoice
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1F2937; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: bold; color: #4F46E5; }
          .invoice-title { font-size: 32px; color: #6B7280; }
          .invoice-number { color: #4F46E5; font-weight: bold; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 14px; color: #6B7280; margin-bottom: 8px; text-transform: uppercase; }
          .section-content { font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #F3F4F6; padding: 12px; text-align: left; font-weight: 600; }
          td { padding: 12px; border-bottom: 1px solid #E5E7EB; }
          .total-row { background: #4F46E5; color: white; }
          .total-row td { font-weight: bold; font-size: 18px; }
          .footer { margin-top: 40px; text-align: center; color: #6B7280; font-size: 12px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
          .paid { background: #DEF7EC; color: #03543F; }
          .unpaid { background: #FDE8E8; color: #9B1C1C; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🏨 Villa Booking</div>
          <div class="invoice-title">INVOICE</div>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <div class="section">
            <div class="section-title">Invoice Number</div>
            <div class="section-content invoice-number">${invoiceNumber}</div>
          </div>
          <div class="section">
            <div class="section-title">Date</div>
            <div class="section-content">${new Date().toLocaleDateString()}</div>
          </div>
          <div class="section">
            <div class="section-title">Status</div>
            <div class="section-content">
              <span class="status ${booking.is_paid ? 'paid' : 'unpaid'}">
                ${booking.is_paid ? 'PAID' : 'UNPAID'}
              </span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Bill To</div>
          <div class="section-content">
            <strong>${booking.customer_name}</strong><br>
            ${booking.customer_email || ''}<br>
            ${booking.customer_phone || ''}
          </div>
        </div>

        <table>
          <tr>
            <th>Description</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Nights</th>
            <th style="text-align: right;">Amount</th>
          </tr>
          <tr>
            <td><strong>${property.name}</strong></td>
            <td>${new Date(booking.check_in_date).toLocaleDateString()}</td>
            <td>${new Date(booking.check_out_date).toLocaleDateString()}</td>
            <td>${getDaysBetween(booking.check_in_date, booking.check_out_date)}</td>
            <td style="text-align: right;">$${booking.total_amount || 0}</td>
          </tr>
          <tr class="total-row">
            <td colspan="4">Total Amount</td>
            <td style="text-align: right;">$${booking.total_amount || 0}</td>
          </tr>
        </table>

        ${booking.notes ? `
        <div class="section">
          <div class="section-title">Notes</div>
          <div class="section-content">${booking.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for choosing Villa Booking!</p>
          <p>For any inquiries, please contact us at support@villabooking.com</p>
        </div>
      </body>
      </html>
    `;

        try {
            const { uri } = await Print.printToFileAsync({ html });

            // Save invoice to database
            const { data: newInvoice, error } = await supabase.from('invoices').insert({
                booking_id: booking.id,
                invoice_number: invoiceNumber,
                amount: booking.total_amount || 0,
                pdf_url: uri,
            }).select().single();

            if (newInvoice && !error) {
                setInvoice(newInvoice);
            }

            // Share the PDF
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert('Success', `Invoice ${invoiceNumber} generated!`);
            }
        } catch (error) {
            console.error('Error generating invoice:', error);
            Alert.alert('Error', 'Failed to generate invoice');
        }
    };

    const shareInvoice = async () => {
        if (!invoice?.pdf_url) {
            await generateInvoice();
            return;
        }

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(invoice.pdf_url);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <Text className="text-gray-500">Loading...</Text>
            </View>
        );
    }

    if (!booking) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <Text className="text-gray-500">Booking not found</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Header with Color */}
            <View
                className="h-24 items-center justify-center"
                style={{ backgroundColor: booking.color }}
            >
                <Text className="text-white text-2xl font-bold">{booking.customer_name}</Text>
            </View>

            <View className="px-4 py-4">
                {/* Property Info */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-gray-500 text-sm">Property</Text>
                    <Text className="text-xl font-bold text-gray-800">{property?.name || 'Unknown'}</Text>
                </View>

                {/* Dates */}
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
                        <Text className="text-gray-500 text-sm">Check-in</Text>
                        <Text className="text-lg font-bold text-gray-800">
                            {new Date(booking.check_in_date).toLocaleDateString()}
                        </Text>
                    </View>
                    <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
                        <Text className="text-gray-500 text-sm">Check-out</Text>
                        <Text className="text-lg font-bold text-gray-800">
                            {new Date(booking.check_out_date).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <View className="bg-primary-100 rounded-2xl p-4 mb-4 items-center">
                    <Text className="text-primary-800 font-bold text-xl">
                        {getDaysBetween(booking.check_in_date, booking.check_out_date)} nights
                    </Text>
                </View>

                {/* Customer Details */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Customer Details</Text>

                    {booking.customer_email && (
                        <View className="flex-row items-center mb-2">
                            <Text className="text-xl mr-2">📧</Text>
                            <Text className="text-gray-600">{booking.customer_email}</Text>
                        </View>
                    )}

                    {booking.customer_phone && (
                        <View className="flex-row items-center">
                            <Text className="text-xl mr-2">📱</Text>
                            <Text className="text-gray-600">{booking.customer_phone}</Text>
                        </View>
                    )}

                    {!booking.customer_email && !booking.customer_phone && (
                        <Text className="text-gray-400">No contact details provided</Text>
                    )}
                </View>

                {/* Payment Section */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-lg font-bold text-gray-800">Payment</Text>
                        <TouchableOpacity onPress={() => setEditing(!editing)}>
                            <Text className="text-primary-600 font-medium">
                                {editing ? 'Cancel' : 'Edit'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {editing ? (
                        <>
                            <Text className="text-gray-600 mb-1">Total Amount</Text>
                            <TextInput
                                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800 mb-3"
                                value={editedAmount}
                                onChangeText={setEditedAmount}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                            />

                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-gray-600">Mark as Paid</Text>
                                <Switch
                                    value={editedPaid}
                                    onValueChange={setEditedPaid}
                                    trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                                    thumbColor={editedPaid ? '#4F46E5' : '#9CA3AF'}
                                />
                            </View>

                            <TouchableOpacity
                                className="bg-primary-600 py-3 rounded-xl"
                                onPress={handleUpdate}
                            >
                                <Text className="text-white font-bold text-center">Save Changes</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-gray-600">Amount</Text>
                                <Text className="text-2xl font-bold text-gray-800">
                                    ${booking.total_amount || 0}
                                </Text>
                            </View>
                            <View className="flex-row items-center justify-between">
                                <Text className="text-gray-600">Status</Text>
                                <View className={`px-3 py-1 rounded-full ${booking.is_paid ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <Text className={`font-bold ${booking.is_paid ? 'text-green-600' : 'text-red-600'}`}>
                                        {booking.is_paid ? '✓ Paid' : '⚠ Unpaid'}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>

                {/* Notes */}
                {booking.notes && (
                    <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                        <Text className="text-lg font-bold text-gray-800 mb-2">Notes</Text>
                        <Text className="text-gray-600">{booking.notes}</Text>
                    </View>
                )}

                {/* Invoice Section */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Invoice</Text>

                    {invoice ? (
                        <View>
                            <Text className="text-gray-600 mb-2">Invoice #{invoice.invoice_number}</Text>
                            <TouchableOpacity
                                className="bg-primary-600 py-3 rounded-xl"
                                onPress={shareInvoice}
                            >
                                <Text className="text-white font-bold text-center">📄 Share Invoice</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            className="bg-primary-600 py-3 rounded-xl"
                            onPress={generateInvoice}
                        >
                            <Text className="text-white font-bold text-center">📄 Generate Invoice</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                    className="bg-red-500 py-4 rounded-xl mb-8"
                    onPress={handleDelete}
                >
                    <Text className="text-white font-bold text-center">Delete Booking</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
