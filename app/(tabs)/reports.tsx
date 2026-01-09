import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { supabase, Booking, Property } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function ReportsScreen() {
    const { user } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;

        const { data: propsData } = await supabase
            .from('properties')
            .select('*')
            .eq('owner_id', user.id);

        if (propsData) {
            setProperties(propsData);

            const propertyIds = propsData.map(p => p.id);

            if (propertyIds.length > 0) {
                const { data: bookingsData } = await supabase
                    .from('bookings')
                    .select('*')
                    .in('property_id', propertyIds)
                    .order('created_at', { ascending: false });

                if (bookingsData) {
                    setBookings(bookingsData);
                }
            }
        }

        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const totalRevenue = bookings
        .filter(b => b.is_paid)
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const pendingRevenue = bookings
        .filter(b => !b.is_paid)
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const totalBookings = bookings.length;
    const paidBookings = bookings.filter(b => b.is_paid).length;
    const unpaidBookings = bookings.filter(b => !b.is_paid).length;

    const now = new Date();
    const currentMonthBookings = bookings.filter(b => {
        const checkIn = new Date(b.check_in_date);
        return checkIn.getMonth() === now.getMonth() && checkIn.getFullYear() === now.getFullYear();
    });

    const currentMonthRevenue = currentMonthBookings
        .filter(b => b.is_paid)
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const upcomingBookings = bookings.filter(b => {
        const checkIn = new Date(b.check_in_date);
        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return checkIn >= today && checkIn <= weekFromNow;
    });

    const propertyStats = properties.map(property => {
        const propBookings = bookings.filter(b => b.property_id === property.id);
        const propRevenue = propBookings
            .filter(b => b.is_paid)
            .reduce((sum, b) => sum + (b.total_amount || 0), 0);
        return { property, bookingCount: propBookings.length, revenue: propRevenue };
    }).sort((a, b) => b.revenue - a.revenue);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <Text className="text-gray-500">Loading reports...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View className="px-4 py-4">
                {/* Revenue Cards */}
                <View className="flex-row gap-3 mb-4">
                    <LinearGradient
                        colors={['#22C55E', '#16A34A']}
                        className="flex-1 rounded-2xl p-4"
                        style={{ borderRadius: 16 }}
                    >
                        <Text className="text-white text-sm mb-1" style={{ opacity: 0.8 }}>Total Revenue</Text>
                        <Text className="text-white text-2xl font-bold">
                            ${totalRevenue.toLocaleString()}
                        </Text>
                    </LinearGradient>
                    <LinearGradient
                        colors={['#F59E0B', '#EA580C']}
                        className="flex-1 rounded-2xl p-4"
                        style={{ borderRadius: 16 }}
                    >
                        <Text className="text-white text-sm mb-1" style={{ opacity: 0.8 }}>Pending</Text>
                        <Text className="text-white text-2xl font-bold">
                            ${pendingRevenue.toLocaleString()}
                        </Text>
                    </LinearGradient>
                </View>

                {/* This Month */}
                <View className="bg-white rounded-2xl p-4 mb-4">
                    <Text className="text-gray-500 text-sm mb-1">This Month's Revenue</Text>
                    <Text className="text-3xl font-bold text-gray-800">
                        ${currentMonthRevenue.toLocaleString()}
                    </Text>
                    <Text className="text-gray-500 mt-1">
                        {currentMonthBookings.length} bookings
                    </Text>
                </View>

                {/* Booking Stats */}
                <Text className="text-lg font-bold text-gray-800 mb-3">Booking Statistics</Text>
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-white rounded-xl p-4 items-center">
                        <Text className="text-3xl font-bold text-indigo-600">{totalBookings}</Text>
                        <Text className="text-gray-500 text-sm">Total</Text>
                    </View>
                    <View className="flex-1 bg-white rounded-xl p-4 items-center">
                        <Text className="text-3xl font-bold text-green-600">{paidBookings}</Text>
                        <Text className="text-gray-500 text-sm">Paid</Text>
                    </View>
                    <View className="flex-1 bg-white rounded-xl p-4 items-center">
                        <Text className="text-3xl font-bold text-red-500">{unpaidBookings}</Text>
                        <Text className="text-gray-500 text-sm">Unpaid</Text>
                    </View>
                </View>

                {/* Upcoming Bookings */}
                <Text className="text-lg font-bold text-gray-800 mb-3">Upcoming (Next 7 Days)</Text>
                {upcomingBookings.length === 0 ? (
                    <View className="bg-white rounded-xl p-4 mb-4">
                        <Text className="text-gray-500 text-center">No upcoming bookings</Text>
                    </View>
                ) : (
                    <View className="bg-white rounded-xl p-4 mb-4">
                        {upcomingBookings.map((booking, index) => (
                            <View
                                key={booking.id}
                                className={`flex-row items-center py-3 ${index !== upcomingBookings.length - 1 ? 'border-b border-gray-100' : ''}`}
                            >
                                <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: booking.color }} />
                                <View className="flex-1">
                                    <Text className="font-medium text-gray-800">{booking.customer_name}</Text>
                                    <Text className="text-gray-500 text-sm">
                                        Check-in: {new Date(booking.check_in_date).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Text className="font-bold text-gray-800">${booking.total_amount || 0}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Property Performance */}
                <Text className="text-lg font-bold text-gray-800 mb-3">Property Performance</Text>
                {propertyStats.length === 0 ? (
                    <View className="bg-white rounded-xl p-4 mb-4">
                        <Text className="text-gray-500 text-center">No properties yet</Text>
                    </View>
                ) : (
                    propertyStats.map((stat, index) => (
                        <View key={stat.property.id} className="bg-white rounded-xl p-4 mb-2">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <Text className="text-xl mr-3">
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏠'}
                                    </Text>
                                    <View>
                                        <Text className="font-bold text-gray-800">{stat.property.name}</Text>
                                        <Text className="text-gray-500 text-sm">{stat.bookingCount} bookings</Text>
                                    </View>
                                </View>
                                <Text className="text-lg font-bold text-green-600">${stat.revenue.toLocaleString()}</Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}
