import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase, Invoice, Booking, Property } from '../../lib/supabase';

export default function InvoiceScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

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

    const handlePrint = async () => {
        if (!invoice || !booking || !property) return;

        const html = generateInvoiceHTML();
        await Print.printAsync({ html });
    };

    const handleShare = async () => {
        if (!invoice?.pdf_url) return;

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(invoice.pdf_url);
        } else {
            Alert.alert('Error', 'Sharing is not available on this device');
        }
    };

    const generateInvoiceHTML = () => {
        if (!invoice || !booking || !property) return '';

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1F2937; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: bold; color: #4F46E5; }
          .invoice-number { color: #4F46E5; font-weight: bold; font-size: 18px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #F3F4F6; padding: 12px; text-align: left; }
          td { padding: 12px; border-bottom: 1px solid #E5E7EB; }
          .total { font-size: 24px; font-weight: bold; color: #4F46E5; text-align: right; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🏨 Villa Booking</div>
          <div class="invoice-number">Invoice #${invoice.invoice_number}</div>
        </div>
        <p><strong>Guest:</strong> ${booking.customer_name}</p>
        <p><strong>Property:</strong> ${property.name}</p>
        <p><strong>Dates:</strong> ${new Date(booking.check_in).toLocaleDateString()} - ${new Date(booking.check_out).toLocaleDateString()} (${getDaysBetween(booking.check_in, booking.check_out)} nights)</p>
        <div class="total">Total: $${invoice.amount}</div>
      </body>
      </html>
    `;
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

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-4">
                {/* Invoice Card */}
                <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-3xl">🧾</Text>
                        <Text className="text-primary-600 font-bold text-lg">{invoice.invoice_number}</Text>
                    </View>

                    <View className="border-b border-gray-100 pb-4 mb-4">
                        <Text className="text-gray-500 text-sm">Bill To</Text>
                        <Text className="text-xl font-bold text-gray-800">{booking.customer_name}</Text>
                        {booking.customer_email && (
                            <Text className="text-gray-600">{booking.customer_email}</Text>
                        )}
                    </View>

                    <View className="border-b border-gray-100 pb-4 mb-4">
                        <Text className="text-gray-500 text-sm">Property</Text>
                        <Text className="text-lg font-bold text-gray-800">{property?.name}</Text>
                    </View>

                    <View className="flex-row justify-between mb-4">
                        <View>
                            <Text className="text-gray-500 text-sm">Check-in</Text>
                            <Text className="font-bold text-gray-800">
                                {new Date(booking.check_in).toLocaleDateString()}
                            </Text>
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm">Check-out</Text>
                            <Text className="font-bold text-gray-800">
                                {new Date(booking.check_out).toLocaleDateString()}
                            </Text>
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm">Nights</Text>
                            <Text className="font-bold text-gray-800">
                                {getDaysBetween(booking.check_in, booking.check_out)}
                            </Text>
                        </View>
                    </View>

                    <View className="bg-primary-50 rounded-xl p-4">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-primary-800 font-bold text-lg">Total Amount</Text>
                            <Text className="text-primary-600 font-bold text-2xl">
                                ${invoice.amount}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-3">
                    <TouchableOpacity
                        className="flex-1 bg-primary-600 py-4 rounded-xl"
                        onPress={handlePrint}
                    >
                        <Text className="text-white font-bold text-center">🖨️ Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 bg-secondary-600 py-4 rounded-xl"
                        onPress={handleShare}
                    >
                        <Text className="text-white font-bold text-center">📤 Share</Text>
                    </TouchableOpacity>
                </View>

                {/* Invoice Date */}
                <Text className="text-gray-400 text-center mt-4">
                    Generated on {new Date(invoice.created_at).toLocaleDateString()}
                </Text>
            </View>
        </ScrollView>
    );
}
