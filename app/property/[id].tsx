import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, RefreshControl, Modal, Pressable } from 'react-native';
import { router, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { propertiesApi, bookingsApi, Property, Booking } from '../../lib/api';

export default function PropertyDetailsScreen() {
    const { id, refresh } = useLocalSearchParams<{ id: string; refresh?: string }>();
    const [property, setProperty] = useState<Property | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    const fetchData = async () => {
        if (!id) return;

        // Fetch property with bookings
        const { data: propData, error: propError } = await propertiesApi.getById(id);

        if (propData && !propError) {
            setProperty(propData);
            setBookings(propData.bookings || []);
        }

        setLoading(false);
        setRefreshing(false);
    };

    // Use useFocusEffect to refetch data when screen comes into focus
    // This ensures newly created bookings appear after navigating back
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [id, refresh])
    );

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
                        await propertiesApi.delete(id);
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
        <>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => setMenuVisible(true)}
                            className="p-2"
                        >
                            <Text className="text-2xl text-gray-600">⋮</Text>
                        </TouchableOpacity>
                    ),
                }}
            />

            {/* Three-dot Menu Modal */}
            <Modal
                visible={menuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <Pressable
                    className="flex-1"
                    onPress={() => setMenuVisible(false)}
                >
                    <View className="absolute top-16 right-4 bg-white rounded-lg shadow-lg py-2 min-w-[180px] elevation-5"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                        }}
                    >
                        <TouchableOpacity
                            className="px-4 py-3 flex-row items-center"
                            onPress={() => {
                                setMenuVisible(false);
                                handleDelete();
                            }}
                        >
                            <Text className="text-red-500 text-base">🗑️  Delete Property</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            <ScrollView
                className="flex-1 bg-gray-50"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Property Image */}
                {property.photo_url ? (
                    <Image source={{ uri: property.photo_url }} className="w-full h-56" resizeMode="cover" />
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
                                            {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()}
                                        </Text>
                                        <Text className="text-xs text-gray-400">
                                            {getDaysBetween(booking.check_in_date, booking.check_out_date)} days
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
                </View>
            </ScrollView>
        </>
    );
}
