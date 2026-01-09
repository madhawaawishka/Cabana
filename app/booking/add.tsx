import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, DateData } from 'react-native-calendars';
import { supabase, Property, generateCustomerColor } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function AddBookingScreen() {
    const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
    const { user } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyId || '');
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectingDate, setSelectingDate] = useState<'checkIn' | 'checkOut' | null>(null);

    useEffect(() => {
        fetchProperties();
    }, [user]);

    const fetchProperties = async () => {
        if (!user) return;

        const { data } = await supabase
            .from('properties')
            .select('*')
            .eq('owner_id', user.id);

        if (data) {
            setProperties(data);
            if (!selectedPropertyId && data.length > 0) {
                setSelectedPropertyId(data[0].id);
            }
        }
    };

    const handleDateSelect = (day: DateData) => {
        if (selectingDate === 'checkIn') {
            setCheckIn(day.dateString);
            if (checkOut && new Date(day.dateString) >= new Date(checkOut)) {
                setCheckOut('');
            }
        } else if (selectingDate === 'checkOut') {
            if (checkIn && new Date(day.dateString) <= new Date(checkIn)) {
                Alert.alert('Invalid Date', 'Check-out must be after check-in');
                return;
            }
            setCheckOut(day.dateString);
        }
        setSelectingDate(null);
    };

    const getMarkedDates = () => {
        const marked: any = {};

        if (checkIn) {
            marked[checkIn] = { selected: true, selectedColor: '#4F46E5', startingDay: true };
        }

        if (checkOut) {
            marked[checkOut] = { selected: true, selectedColor: '#4F46E5', endingDay: true };
        }

        // Mark days in between
        if (checkIn && checkOut) {
            const start = new Date(checkIn);
            const end = new Date(checkOut);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                if (dateStr !== checkIn && dateStr !== checkOut) {
                    marked[dateStr] = { selected: true, selectedColor: '#A5B4FC' };
                }
            }
        }

        return marked;
    };

    const handleSave = async () => {
        if (!selectedPropertyId) {
            Alert.alert('Error', 'Please select a property');
            return;
        }

        if (!customerName.trim()) {
            Alert.alert('Error', 'Please enter customer name');
            return;
        }

        if (!checkIn || !checkOut) {
            Alert.alert('Error', 'Please select check-in and check-out dates');
            return;
        }

        setLoading(true);

        const color = generateCustomerColor(customerName);

        const { data: booking, error } = await supabase.from('bookings').insert({
            property_id: selectedPropertyId,
            customer_name: customerName.trim(),
            customer_email: customerEmail.trim() || null,
            customer_phone: customerPhone.trim() || null,
            check_in: checkIn,
            check_out: checkOut,
            total_amount: totalAmount ? parseFloat(totalAmount) : null,
            is_paid: isPaid,
            color: color,
            notes: notes.trim() || null,
        }).select().single();

        if (error) {
            Alert.alert('Error', 'Failed to create booking');
            console.error('Booking error:', error);
        } else {
            // Create housekeeping entry for this booking
            await supabase.from('housekeeping').insert({
                property_id: selectedPropertyId,
                booking_id: booking.id,
                is_clean: false,
            });

            Alert.alert('Success', 'Booking created successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        }

        setLoading(false);
    };

    const getDaysBetween = (): number => {
        if (!checkIn || !checkOut) return 0;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-gray-50"
        >
            <ScrollView className="flex-1 p-4">
                {/* Property Selector */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-gray-600 mb-2 font-medium">Select Property</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {properties.map((property) => (
                            <TouchableOpacity
                                key={property.id}
                                className={`px-4 py-2 rounded-full mr-2 ${selectedPropertyId === property.id
                                        ? 'bg-primary-600'
                                        : 'bg-gray-100'
                                    }`}
                                onPress={() => setSelectedPropertyId(property.id)}
                            >
                                <Text className={`font-medium ${selectedPropertyId === property.id ? 'text-white' : 'text-gray-700'
                                    }`}>
                                    {property.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Customer Info */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Customer Details</Text>

                    <Text className="text-gray-600 mb-1 font-medium">Name *</Text>
                    <TextInput
                        className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800 mb-3"
                        placeholder="Customer name"
                        placeholderTextColor="#9CA3AF"
                        value={customerName}
                        onChangeText={setCustomerName}
                    />

                    <Text className="text-gray-600 mb-1 font-medium">Email</Text>
                    <TextInput
                        className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800 mb-3"
                        placeholder="customer@email.com"
                        placeholderTextColor="#9CA3AF"
                        value={customerEmail}
                        onChangeText={setCustomerEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Text className="text-gray-600 mb-1 font-medium">Phone</Text>
                    <TextInput
                        className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                        placeholder="+1 234 567 8900"
                        placeholderTextColor="#9CA3AF"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        keyboardType="phone-pad"
                    />
                </View>

                {/* Date Selection */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Booking Dates</Text>

                    <View className="flex-row gap-3 mb-4">
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded-xl border-2 ${selectingDate === 'checkIn' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'
                                }`}
                            onPress={() => setSelectingDate('checkIn')}
                        >
                            <Text className="text-gray-500 text-sm">Check-in</Text>
                            <Text className="text-gray-800 font-bold">
                                {checkIn ? new Date(checkIn).toLocaleDateString() : 'Select date'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className={`flex-1 p-3 rounded-xl border-2 ${selectingDate === 'checkOut' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'
                                }`}
                            onPress={() => setSelectingDate('checkOut')}
                        >
                            <Text className="text-gray-500 text-sm">Check-out</Text>
                            <Text className="text-gray-800 font-bold">
                                {checkOut ? new Date(checkOut).toLocaleDateString() : 'Select date'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {selectingDate && (
                        <Calendar
                            markedDates={getMarkedDates()}
                            onDayPress={handleDateSelect}
                            minDate={selectingDate === 'checkOut' && checkIn ? checkIn : new Date().toISOString().split('T')[0]}
                            theme={{
                                todayTextColor: '#4F46E5',
                                selectedDayBackgroundColor: '#4F46E5',
                                arrowColor: '#4F46E5',
                            }}
                        />
                    )}

                    {checkIn && checkOut && (
                        <View className="bg-primary-50 rounded-xl p-3 mt-3">
                            <Text className="text-primary-800 font-bold text-center">
                                {getDaysBetween()} nights
                            </Text>
                        </View>
                    )}
                </View>

                {/* Payment */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Payment</Text>

                    <Text className="text-gray-600 mb-1 font-medium">Total Amount</Text>
                    <TextInput
                        className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800 mb-3"
                        placeholder="0.00"
                        placeholderTextColor="#9CA3AF"
                        value={totalAmount}
                        onChangeText={setTotalAmount}
                        keyboardType="decimal-pad"
                    />

                    <View className="flex-row items-center justify-between">
                        <Text className="text-gray-600 font-medium">Mark as Paid</Text>
                        <Switch
                            value={isPaid}
                            onValueChange={setIsPaid}
                            trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                            thumbColor={isPaid ? '#4F46E5' : '#9CA3AF'}
                        />
                    </View>
                </View>

                {/* Notes */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-gray-600 mb-2 font-medium">Notes (Optional)</Text>
                    <TextInput
                        className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800 min-h-[100px]"
                        placeholder="Any special requests or notes..."
                        placeholderTextColor="#9CA3AF"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                {/* Color Preview */}
                {customerName && (
                    <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm flex-row items-center">
                        <View
                            className="w-8 h-8 rounded-full mr-3"
                            style={{ backgroundColor: generateCustomerColor(customerName) }}
                        />
                        <Text className="text-gray-600">
                            Calendar color for {customerName}
                        </Text>
                    </View>
                )}

                {/* Save Button */}
                <TouchableOpacity
                    className={`bg-primary-600 py-4 rounded-xl mb-8 ${loading ? 'opacity-70' : ''}`}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text className="text-white font-bold text-lg text-center">
                        {loading ? 'Creating...' : 'Create Booking'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
