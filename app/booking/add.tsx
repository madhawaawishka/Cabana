import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase, Property, Booking, generateCustomerColor } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { scheduleBookingNotifications } from '../../lib/notifications';
import { createCheckInNotification, createCheckOutNotification } from '../../lib/notificationService';

export default function AddBookingScreen() {
    const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
    const { user } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyId || '');
    const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [checkInTime, setCheckInTime] = useState('14:00');
    const [checkOutTime, setCheckOutTime] = useState('11:00');
    const [totalAmount, setTotalAmount] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [hasAdvancePayment, setHasAdvancePayment] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectingDate, setSelectingDate] = useState<'checkIn' | 'checkOut' | null>(null);
    const [showCheckInTimePicker, setShowCheckInTimePicker] = useState(false);
    const [showCheckOutTimePicker, setShowCheckOutTimePicker] = useState(false);

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const parseTimeToDate = (time: string): Date => {
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const handleCheckInTimeChange = (_event: any, selectedDate?: Date) => {
        setShowCheckInTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            setCheckInTime(`${hours}:${minutes}`);
        }
    };

    const handleCheckOutTimeChange = (_event: any, selectedDate?: Date) => {
        setShowCheckOutTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            setCheckOutTime(`${hours}:${minutes}`);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [user]);

    // Fetch existing bookings when property changes
    useEffect(() => {
        if (selectedPropertyId) {
            fetchExistingBookings();
        }
    }, [selectedPropertyId]);

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

    const fetchExistingBookings = async () => {
        if (!selectedPropertyId) return;

        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('property_id', selectedPropertyId);

        if (data && !error) {
            setExistingBookings(data);
        }
    };

    // Check if a date falls within any existing booking
    const isDateBooked = (dateString: string): Booking | null => {
        const date = new Date(dateString);
        for (const booking of existingBookings) {
            const checkInDate = new Date(booking.check_in_date);
            const checkOutDate = new Date(booking.check_out_date);
            if (date >= checkInDate && date <= checkOutDate) {
                return booking;
            }
        }
        return null;
    };

    // Check if a date range overlaps with any existing booking
    const hasDateRangeConflict = (startDate: string, endDate: string): Booking | null => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (const booking of existingBookings) {
            const bookingStart = new Date(booking.check_in_date);
            const bookingEnd = new Date(booking.check_out_date);

            // Check if ranges overlap
            if (start <= bookingEnd && end >= bookingStart) {
                return booking;
            }
        }
        return null;
    };

    const handleDateSelect = (day: DateData) => {
        const conflictingBooking = isDateBooked(day.dateString);

        if (conflictingBooking) {
            Alert.alert(
                '📅 Date Already Booked',
                `This date is already booked by ${conflictingBooking.customer_name} (${new Date(conflictingBooking.check_in_date).toLocaleDateString()} - ${new Date(conflictingBooking.check_out_date).toLocaleDateString()}).`,
                [{ text: 'OK', style: 'default' }]
            );
            return;
        }

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

            // Check if the date range conflicts with existing bookings
            if (checkIn) {
                const rangeConflict = hasDateRangeConflict(checkIn, day.dateString);
                if (rangeConflict) {
                    Alert.alert(
                        '📅 Booking Conflict',
                        `Your selected dates overlap with a booking by ${rangeConflict.customer_name} (${new Date(rangeConflict.check_in_date).toLocaleDateString()} - ${new Date(rangeConflict.check_out_date).toLocaleDateString()}).`,
                        [{ text: 'OK', style: 'default' }]
                    );
                    return;
                }
            }

            setCheckOut(day.dateString);
        }
        setSelectingDate(null);
    };

    const getMarkedDates = () => {
        const marked: any = {};

        // First, mark all existing booked dates with a disabled/red color
        existingBookings.forEach((booking) => {
            const start = new Date(booking.check_in_date);
            const end = new Date(booking.check_out_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                marked[dateStr] = {
                    marked: true,
                    dotColor: booking.color || '#EF4444',
                    disableTouchEvent: false,
                };
            }
        });

        // Then, overlay the currently selected dates
        if (checkIn) {
            marked[checkIn] = {
                ...marked[checkIn],
                selected: true,
                selectedColor: '#4F46E5',
                startingDay: true
            };
        }

        if (checkOut) {
            marked[checkOut] = {
                ...marked[checkOut],
                selected: true,
                selectedColor: '#4F46E5',
                endingDay: true
            };
        }

        // Mark days in between
        if (checkIn && checkOut) {
            const start = new Date(checkIn);
            const end = new Date(checkOut);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                if (dateStr !== checkIn && dateStr !== checkOut) {
                    marked[dateStr] = {
                        ...marked[dateStr],
                        selected: true,
                        selectedColor: '#A5B4FC'
                    };
                }
            }
        }

        return marked;
    };

    // Helper function to get user-friendly error messages
    const getErrorMessage = (error: any): { title: string; message: string } => {
        // PostgreSQL error codes
        const errorCode = error?.code;
        const errorMessage = error?.message?.toLowerCase() || '';
        const errorDetails = error?.details?.toLowerCase() || '';
        const errorHint = error?.hint?.toLowerCase() || '';

        // Not-null violation (23502) - missing required fields
        if (errorCode === '23502') {
            if (errorMessage.includes('total_amount') || errorDetails.includes('total_amount')) {
                return {
                    title: '💰 Missing Amount',
                    message: 'Please add a total amount to complete the booking.'
                };
            }
            if (errorMessage.includes('customer_name') || errorDetails.includes('customer_name')) {
                return {
                    title: '👤 Missing Customer',
                    message: 'Please enter the customer name to continue.'
                };
            }
            if (errorMessage.includes('check_in') || errorDetails.includes('check_in')) {
                return {
                    title: '📅 Missing Check-in Date',
                    message: 'Please select a check-in date for this booking.'
                };
            }
            if (errorMessage.includes('check_out') || errorDetails.includes('check_out')) {
                return {
                    title: '📅 Missing Check-out Date',
                    message: 'Please select a check-out date for this booking.'
                };
            }
            if (errorMessage.includes('property') || errorDetails.includes('property')) {
                return {
                    title: '🏠 Missing Property',
                    message: 'Please select a property for this booking.'
                };
            }
            return {
                title: '📝 Missing Information',
                message: 'Please fill in all required fields to complete the booking.'
            };
        }

        // Foreign key violation (23503) - invalid reference
        if (errorCode === '23503') {
            return {
                title: '🔗 Invalid Reference',
                message: 'The selected property may no longer exist. Please refresh and try again.'
            };
        }

        // Unique violation (23505) - duplicate entry
        if (errorCode === '23505') {
            return {
                title: '📅 Booking Conflict',
                message: 'A booking already exists for these dates. Please choose different dates.'
            };
        }

        // Check constraint violation (23514)
        if (errorCode === '23514') {
            if (errorMessage.includes('amount') || errorDetails.includes('amount')) {
                return {
                    title: '💰 Invalid Amount',
                    message: 'Please enter a valid amount greater than zero.'
                };
            }
            if (errorMessage.includes('date') || errorDetails.includes('date')) {
                return {
                    title: '📅 Invalid Dates',
                    message: 'Check-out date must be after check-in date.'
                };
            }
            return {
                title: '⚠️ Invalid Data',
                message: 'Some values are invalid. Please check your entries and try again.'
            };
        }

        // RLS policy violation
        if (errorCode === '42501' || errorMessage.includes('row-level security')) {
            return {
                title: '🔒 Permission Denied',
                message: 'You don\'t have permission to create this booking. Please try logging in again.'
            };
        }

        // Network/connection errors
        if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
            return {
                title: '📶 Connection Error',
                message: 'Unable to connect. Please check your internet connection and try again.'
            };
        }

        // Default fallback
        return {
            title: '❌ Booking Failed',
            message: 'Something went wrong while creating the booking. Please try again.'
        };
    };

    const handleSave = async () => {
        // Custom validation with friendly messages
        if (!selectedPropertyId) {
            Alert.alert('🏠 Select Property', 'Please choose a property for this booking.');
            return;
        }

        if (!customerName.trim()) {
            Alert.alert('👤 Customer Name Required', 'Please enter the customer\'s name to continue.');
            return;
        }

        if (!checkIn) {
            Alert.alert('📅 Check-in Date Required', 'Please select a check-in date for the booking.');
            return;
        }

        if (!checkOut) {
            Alert.alert('📅 Check-out Date Required', 'Please select a check-out date for the booking.');
            return;
        }

        if (!totalAmount || parseFloat(totalAmount) <= 0) {
            Alert.alert('💰 Total Amount Required', 'Please add a total amount to complete the booking.');
            return;
        }

        if (hasAdvancePayment && advanceAmount) {
            const advance = parseFloat(advanceAmount);
            const total = parseFloat(totalAmount);
            if (advance > total) {
                Alert.alert('💰 Invalid Advance Amount', 'Advance payment cannot be greater than the total amount.');
                return;
            }
            if (advance <= 0) {
                Alert.alert('💰 Invalid Advance Amount', 'Please enter a valid advance payment amount.');
                return;
            }
        }

        setLoading(true);

        const color = generateCustomerColor(customerName);

        const { data: booking, error } = await supabase.from('bookings').insert({
            property_id: selectedPropertyId,
            customer_name: customerName.trim(),
            customer_email: customerEmail.trim() || null,
            customer_phone: customerPhone.trim() || null,
            check_in_date: checkIn,
            check_out_date: checkOut,
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
            total_amount: parseFloat(totalAmount),
            advance_payment: hasAdvancePayment && advanceAmount ? parseFloat(advanceAmount) : null,
            is_paid: isPaid,
            color: color,
            notes: notes.trim() || null,
        }).select().single();

        if (error) {
            const { title, message } = getErrorMessage(error);
            Alert.alert(title, message);
            console.error('Booking error:', error);
        } else {
            // Create housekeeping entry for this booking
            await supabase.from('housekeeping').insert({
                property_id: selectedPropertyId,
                booking_id: booking.id,
                is_clean: false,
            });

            // Schedule push notifications and create in-app notifications
            const selectedProperty = properties.find(p => p.id === selectedPropertyId);
            if (selectedProperty) {
                await scheduleBookingNotifications(booking, selectedProperty.name);
                // Create in-app notifications for check-in and check-out
                await createCheckInNotification(
                    booking.id,
                    customerName.trim(),
                    selectedProperty.name,
                    checkIn,
                    checkInTime
                );
                await createCheckOutNotification(
                    booking.id,
                    customerName.trim(),
                    selectedProperty.name,
                    checkOut,
                    checkOutTime
                );
            }

            Alert.alert('Success', 'Booking created successfully!', [
                {
                    text: 'OK', onPress: () => router.replace({
                        pathname: '/property/[id]',
                        params: { id: selectedPropertyId, refresh: Date.now().toString() }
                    })
                }
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

                {/* Time Selection */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Check-in / Check-out Time</Text>

                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Text className="text-gray-600 mb-2 font-medium">Check-in Time</Text>
                            <TouchableOpacity
                                className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center justify-between"
                                onPress={() => setShowCheckInTimePicker(true)}
                            >
                                <Text className="text-gray-800 font-medium">{formatTime(checkInTime)}</Text>
                                <Text className="text-gray-400">🕐</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-1">
                            <Text className="text-gray-600 mb-2 font-medium">Check-out Time</Text>
                            <TouchableOpacity
                                className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center justify-between"
                                onPress={() => setShowCheckOutTimePicker(true)}
                            >
                                <Text className="text-gray-800 font-medium">{formatTime(checkOutTime)}</Text>
                                <Text className="text-gray-400">🕐</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showCheckInTimePicker && (
                        <DateTimePicker
                            value={parseTimeToDate(checkInTime)}
                            mode="time"
                            is24Hour={false}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleCheckInTimeChange}
                        />
                    )}

                    {showCheckOutTimePicker && (
                        <DateTimePicker
                            value={parseTimeToDate(checkOutTime)}
                            mode="time"
                            is24Hour={false}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleCheckOutTimeChange}
                        />
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

                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-gray-600 font-medium">Mark as Paid</Text>
                        <Switch
                            value={isPaid}
                            onValueChange={setIsPaid}
                            trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                            thumbColor={isPaid ? '#4F46E5' : '#9CA3AF'}
                        />
                    </View>

                    {/* Advance Payment Toggle */}
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-gray-600 font-medium">Advance Payment Received</Text>
                        <Switch
                            value={hasAdvancePayment}
                            onValueChange={(value) => {
                                setHasAdvancePayment(value);
                                if (!value) {
                                    setAdvanceAmount('');
                                }
                            }}
                            trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                            thumbColor={hasAdvancePayment ? '#22C55E' : '#9CA3AF'}
                        />
                    </View>

                    {/* Advance Payment Amount Input */}
                    {hasAdvancePayment && (
                        <View className="bg-green-50 rounded-xl p-3 mb-3" style={{ backgroundColor: '#F0FDF4' }}>
                            <Text className="text-green-700 mb-2 font-medium" style={{ color: '#15803D' }}>Advance Amount</Text>
                            <TextInput
                                className="bg-white rounded-xl px-4 py-3 text-gray-800 border border-green-200"
                                placeholder="Enter advance amount"
                                placeholderTextColor="#9CA3AF"
                                value={advanceAmount}
                                onChangeText={setAdvanceAmount}
                                keyboardType="decimal-pad"
                                style={{ borderColor: '#BBF7D0' }}
                            />

                            {/* Balance Calculation */}
                            {totalAmount && advanceAmount && (
                                <View className="mt-3 pt-3 border-t" style={{ borderColor: '#BBF7D0' }}>
                                    <View className="flex-row justify-between mb-1">
                                        <Text className="text-gray-600">Total Amount:</Text>
                                        <Text className="text-gray-800 font-medium">${parseFloat(totalAmount).toFixed(2)}</Text>
                                    </View>
                                    <View className="flex-row justify-between mb-1">
                                        <Text className="text-green-600" style={{ color: '#16A34A' }}>Advance Paid:</Text>
                                        <Text className="text-green-600 font-medium" style={{ color: '#16A34A' }}>-${parseFloat(advanceAmount).toFixed(2)}</Text>
                                    </View>
                                    <View className="flex-row justify-between pt-2 border-t" style={{ borderColor: '#BBF7D0' }}>
                                        <Text className="text-primary-700 font-bold" style={{ color: '#4338CA' }}>Balance Due:</Text>
                                        <Text className="text-primary-700 font-bold text-lg" style={{ color: '#4338CA' }}>
                                            ${Math.max(0, parseFloat(totalAmount) - parseFloat(advanceAmount)).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
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
