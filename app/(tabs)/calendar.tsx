import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { router, useFocusEffect } from 'expo-router';
import { supabase, Booking, Property, generateCustomerColor } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface MarkedDates {
    [date: string]: {
        dots?: Array<{ key: string; color: string }>;
    };
}

export default function CalendarScreen() {
    const { user } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [markedDates, setMarkedDates] = useState<MarkedDates>({});
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const fetchProperties = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('owner_id', user.id);

        if (data && !error) {
            setProperties(data);
            if (data.length > 0 && !selectedProperty) {
                setSelectedProperty(data[0]);
            }
        }
    };

    const fetchBookings = async () => {
        if (!selectedProperty) return;

        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('property_id', selectedProperty.id)
            .order('check_in_date', { ascending: true });

        if (data && !error) {
            setBookings(data);
            generateMarkedDates(data);
        }
        setRefreshing(false);
    };

    const generateMarkedDates = (bookingData: Booking[]) => {
        const marked: MarkedDates = {};

        bookingData.forEach((booking) => {
            const start = new Date(booking.check_in_date);
            const end = new Date(booking.check_out_date);
            const color = booking.color || generateCustomerColor(booking.customer_name);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];

                if (!marked[dateStr]) {
                    marked[dateStr] = { dots: [] };
                }

                // Add a dot for this booking (use booking id as key to avoid duplicates)
                marked[dateStr].dots!.push({
                    key: booking.id,
                    color: color,
                });
            }
        });

        setMarkedDates(marked);
    };

    useFocusEffect(
        useCallback(() => {
            fetchProperties();
        }, [user])
    );

    useFocusEffect(
        useCallback(() => {
            if (selectedProperty) {
                fetchBookings();
            }
        }, [selectedProperty])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const handleDayPress = (day: DateData) => {
        setSelectedDate(day.dateString);
    };

    const getBookingsForDate = (date: string) => {
        return bookings.filter((b) => {
            const checkIn = new Date(b.check_in_date);
            const checkOut = new Date(b.check_out_date);
            const selected = new Date(date);
            return selected >= checkIn && selected <= checkOut;
        });
    };

    const getDaysBetween = (start: string, end: string): number => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    if (properties.length === 0) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50 p-8">
                <Text className="text-6xl mb-4">📅</Text>
                <Text className="text-xl font-bold text-gray-800 text-center">
                    No Properties Yet
                </Text>
                <Text className="text-gray-500 text-center mt-2">
                    Add a property first to manage bookings
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Property Selector */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-4 py-4"
            >
                {properties.map((property) => (
                    <TouchableOpacity
                        key={property.id}
                        className={`px-4 py-2 rounded-full mr-2 ${selectedProperty?.id === property.id
                            ? 'bg-primary-600'
                            : 'bg-white border border-gray-300'
                            }`}
                        onPress={() => setSelectedProperty(property)}
                    >
                        <Text
                            className={`font-medium ${selectedProperty?.id === property.id ? 'text-white' : 'text-gray-700'
                                }`}
                        >
                            {property.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Calendar */}
            <View className="mx-4 rounded-xl overflow-hidden shadow-lg bg-white">
                <Calendar
                    markingType="multi-dot"
                    markedDates={markedDates}
                    onDayPress={handleDayPress}
                    theme={{
                        backgroundColor: '#ffffff',
                        calendarBackground: '#ffffff',
                        textSectionTitleColor: '#6B7280',
                        selectedDayBackgroundColor: '#4F46E5',
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: '#4F46E5',
                        dayTextColor: '#1F2937',
                        textDisabledColor: '#D1D5DB',
                        arrowColor: '#4F46E5',
                        monthTextColor: '#1F2937',
                        textDayFontWeight: '500',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '600',
                    }}
                />
            </View>

            {/* Add Booking Button */}
            <TouchableOpacity
                className="bg-primary-600 mx-4 mt-4 py-4 rounded-xl"
                onPress={() => router.push({
                    pathname: '/booking/add',
                    params: { propertyId: selectedProperty?.id }
                })}
            >
                <Text className="text-white font-bold text-lg text-center">
                    + Add New Booking
                </Text>
            </TouchableOpacity>

            {/* Bookings for Selected Date */}
            {selectedDate && (
                <View className="mx-4 mt-4 mb-2">
                    <Text className="text-lg font-bold text-gray-800 mb-2">
                        Bookings on {new Date(selectedDate).toLocaleDateString()}
                    </Text>
                    {getBookingsForDate(selectedDate).length === 0 ? (
                        <Text className="text-gray-500">No bookings for this date</Text>
                    ) : (
                        getBookingsForDate(selectedDate).map((booking) => (
                            <TouchableOpacity
                                key={booking.id}
                                className="bg-white rounded-xl p-4 mb-2 shadow-sm flex-row items-center"
                                onPress={() => router.push(`/booking/${booking.id}`)}
                            >
                                <View
                                    className="w-4 h-4 rounded-full mr-3"
                                    style={{ backgroundColor: booking.color }}
                                />
                                <View className="flex-1">
                                    <Text className="font-bold text-gray-800">{booking.customer_name}</Text>
                                    <Text className="text-gray-500 text-sm">
                                        {getDaysBetween(booking.check_in_date, booking.check_out_date)} days
                                    </Text>
                                </View>
                                <Text className={`font-medium ${booking.is_paid ? 'text-green-600' : 'text-red-500'}`}>
                                    {booking.is_paid ? 'Paid' : 'Unpaid'}
                                </Text>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            )}

            {/* Customer Legend */}
            <View className="mx-4 mt-4 mb-6">
                <Text className="text-lg font-bold text-gray-800 mb-3">All Bookings</Text>
                {bookings.length === 0 ? (
                    <View className="bg-white rounded-xl p-6 items-center">
                        <Text className="text-gray-500">No bookings yet for this property</Text>
                    </View>
                ) : (
                    bookings.map((booking) => (
                        <TouchableOpacity
                            key={booking.id}
                            className="bg-white rounded-xl p-4 mb-2 shadow-sm"
                            onPress={() => router.push(`/booking/${booking.id}`)}
                        >
                            <View className="flex-row items-center">
                                <View
                                    className="w-12 h-12 rounded-full items-center justify-center mr-3"
                                    style={{ backgroundColor: booking.color + '30' }}
                                >
                                    <View
                                        className="w-6 h-6 rounded-full"
                                        style={{ backgroundColor: booking.color }}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-gray-800">{booking.customer_name}</Text>
                                    <Text className="text-gray-500 text-sm">
                                        {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()}
                                    </Text>
                                    <Text className="text-gray-500 text-sm">
                                        {getDaysBetween(booking.check_in_date, booking.check_out_date)} days •
                                        {booking.total_amount ? ` $${booking.total_amount}` : ' No amount set'}
                                    </Text>
                                </View>
                                <View className="items-end">
                                    <Text className={`font-bold ${booking.is_paid ? 'text-green-600' : 'text-red-500'}`}>
                                        {booking.is_paid ? '✓ Paid' : '⚠ Unpaid'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </ScrollView>
    );
}
