import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { housekeepingApi, HousekeepingWithDetails, Property, Booking } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function HousekeepingScreen() {
    const { user } = useAuth();
    const [housekeepingItems, setHousekeepingItems] = useState<HousekeepingWithDetails[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;

        const { data, error } = await housekeepingApi.getAll();

        if (data && !error) {
            setHousekeepingItems(data);
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

    const toggleCleanStatus = async (item: HousekeepingWithDetails) => {
        const newStatus = !item.is_clean;

        const { error } = await housekeepingApi.update(item.id, {
            is_clean: newStatus,
        });

        if (error) {
            Alert.alert('Error', 'Failed to update cleaning status');
        } else {
            fetchData();
        }
    };

    const toggleOwnerVerification = async (item: HousekeepingWithDetails) => {
        const { error } = await housekeepingApi.update(item.id, {
            verified_by_owner: !item.verified_by_owner,
        });

        if (error) {
            Alert.alert('Error', 'Failed to verify cleaning');
        } else {
            fetchData();
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <Text className="text-gray-500">Loading housekeeping...</Text>
            </View>
        );
    }

    if (housekeepingItems.length === 0) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50 p-8">
                <Text className="text-6xl mb-4">🧹</Text>
                <Text className="text-xl font-bold text-gray-800 text-center">
                    No Housekeeping Tasks
                </Text>
                <Text className="text-gray-500 text-center mt-2">
                    Housekeeping tasks are created automatically when bookings are added
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View className="px-4 py-4">
                <Text className="text-lg font-bold text-gray-800 mb-4">
                    Housekeeping Status
                </Text>

                {housekeepingItems.map((item) => (
                    <View key={item.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-1">
                                <Text className="font-bold text-gray-800 text-lg">
                                    {item.property?.name || 'Unknown Property'}
                                </Text>
                                <Text className="text-gray-500 text-sm">
                                    Guest: {item.booking?.customer_name || 'Unknown'}
                                </Text>
                                <Text className="text-gray-500 text-sm">
                                    Checkout: {item.booking?.check_out_date ? new Date(item.booking.check_out_date).toLocaleDateString() : 'N/A'}
                                </Text>
                            </View>
                            <View className={`px-3 py-1 rounded-full ${item.is_clean ? 'bg-green-100' : 'bg-red-100'}`}>
                                <Text className={`font-bold ${item.is_clean ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.is_clean ? '✓ Clean' : '✗ Dirty'}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-xl ${item.is_clean ? 'bg-gray-200' : 'bg-green-500'
                                    }`}
                                onPress={() => toggleCleanStatus(item)}
                            >
                                <Text className={`text-center font-bold ${item.is_clean ? 'text-gray-600' : 'text-white'
                                    }`}>
                                    {item.is_clean ? 'Mark as Dirty' : 'Mark as Clean'}
                                </Text>
                            </TouchableOpacity>

                            {item.is_clean && (
                                <TouchableOpacity
                                    className={`flex-1 py-3 rounded-xl ${item.verified_by_owner ? 'bg-primary-600' : 'bg-primary-100'
                                        }`}
                                    onPress={() => toggleOwnerVerification(item)}
                                >
                                    <Text className={`text-center font-bold ${item.verified_by_owner ? 'text-white' : 'text-primary-600'
                                        }`}>
                                        {item.verified_by_owner ? '✓ Verified' : 'Verify Clean'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {item.cleaned_at && (
                            <Text className="text-gray-400 text-sm mt-2 text-center">
                                Cleaned on {new Date(item.cleaned_at).toLocaleString()}
                            </Text>
                        )}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}
