import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase, Property, Booking } from '../../lib/supabase';

export default function PropertyDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [property, setProperty] = useState<Property | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        if (!id) return;

        // Fetch property
        const { data: propData, error: propError } = await supabase
            .from('properties')
            .select('*')
            .eq('id', id)
            .single();

        if (propData && !propError) {
            setProperty(propData);
        }

        // Fetch bookings
        const { data: bookingsData } = await supabase
            .from('bookings')
            .select('*')
            .eq('property_id', id)
            .order('check_in', { ascending: false });

        if (bookingsData) {
            setBookings(bookingsData);
        }

        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Property',
            'Are you sure? This will delete all bookings associated with this property.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.from('properties').delete().eq('id', id);
                        router.back();
                    },
                },
            ]
        );
    };

    const getDaysBetween = (start: string, end: string): number => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const totalRevenue = bookings
        .filter(b => b.is_paid)
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const pendingPayments = bookings.filter(b => !b.is_paid).length;

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <Text className="text-gray-500">Loading...</Text>
            </View>
        );
    }

    if (!property) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <Text className="text-gray-500">Property not found</Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Property Image */}
            {property.image_url ? (
                <Image source={{ uri: property.image_url }} className="w-full h-56" resizeMode="cover" />
            ) : (
                <View className="w-full h-56 bg-indigo-500 items-center justify-center">
                    <Text className="text-8xl">🏨</Text>
                </View>
            )}

            <View className="px-4 py-4">
                {/* Property Info */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-2xl font-bold text-gray-800">{property.name}</Text>
                    <Text className="text-gray-500 mt-1">
                        Added {new Date(property.created_at).toLocaleDateString()}
                    </Text>
                </View>

                {/* Stats */}
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-green-500 rounded-2xl p-4">
                        <Text className="text-white/80 text-sm">Total Revenue</Text>
                        <Text className="text-white text-xl font-bold">${totalRevenue}</Text>
                    </View>
                    <View className="flex-1 bg-primary-500 rounded-2xl p-4">
                        <Text className="text-white/80 text-sm">Total Bookings</Text>
                        <Text className="text-white text-xl font-bold">{bookings.length}</Text>
                    </View>
                    <View className="flex-1 bg-yellow-500 rounded-2xl p-4">
                        <Text className="text-white/80 text-sm">Pending</Text>
                        <Text className="text-white text-xl font-bold">{pendingPayments}</Text>
                    </View>
                </View>

                {/* Add Booking Button */}
                <TouchableOpacity
                    className="bg-primary-600 py-4 rounded-xl mb-4"
                    onPress={() => router.push({
                        pathname: '/booking/add',
                        params: { propertyId: id }
                    })}
                >
                    <Text className="text-white font-bold text-lg text-center">+ Add New Booking</Text>
                </TouchableOpacity>

                {/* Bookings List */}
                <Text className="text-lg font-bold text-gray-800 mb-3">Booking History</Text>
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
                                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                    style={{ backgroundColor: booking.color + '30' }}
                                >
                                    <View
                                        className="w-5 h-5 rounded-full"
                                        style={{ backgroundColor: booking.color }}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-gray-800">{booking.customer_name}</Text>
                                    <Text className="text-gray-500 text-sm">
                                        {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                                    </Text>
                                    <Text className="text-gray-500 text-sm">
                                        {getDaysBetween(booking.check_in, booking.check_out)} days
                                    </Text>
                                </View>
                                <View className="items-end">
                                    <Text className="font-bold text-gray-800">
                                        ${booking.total_amount || 0}
                                    </Text>
                                    <Text className={`text-sm font-medium ${booking.is_paid ? 'text-green-600' : 'text-red-500'}`}>
                                        {booking.is_paid ? '✓ Paid' : '⚠ Unpaid'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                {/* Delete Button */}
                <TouchableOpacity
                    className="bg-red-500 py-4 rounded-xl mt-6 mb-8"
                    onPress={handleDelete}
                >
                    <Text className="text-white font-bold text-center">Delete Property</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
