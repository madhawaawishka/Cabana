import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase, Housekeeping, Property, Booking } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface HousekeepingWithDetails extends Housekeeping {
    property: Property;
    booking: Booking;
}

export default function HousekeepingScreen() {
    const { user, profile } = useAuth();
    const [housekeepingItems, setHousekeepingItems] = useState<HousekeepingWithDetails[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;

        // First, get all properties for this user
        const { data: propsData } = await supabase
            .from('properties')
            .select('*')
            .eq('owner_id', user.id);

        if (propsData) {
            setProperties(propsData);

            // Get housekeeping items
            const propertyIds = propsData.map(p => p.id);

            if (propertyIds.length > 0) {
                const { data: hkData } = await supabase
                    .from('housekeeping')
                    .select(`
            *,
            property:properties(*),
            booking:bookings(*)
          `)
                    .in('property_id', propertyIds)
                    .order('created_at', { ascending: false });

                if (hkData) {
                    setHousekeepingItems(hkData as HousekeepingWithDetails[]);
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

    const toggleCleanStatus = async (item: HousekeepingWithDetails) => {
        const newStatus = !item.is_clean;

        const { error } = await supabase
            .from('housekeeping')
            .update({
                is_clean: newStatus,
                cleaned_by: newStatus ? user?.id : null,
                cleaned_at: newStatus ? new Date().toISOString() : null,
            })
            .eq('id', item.id);

        if (error) {
            Alert.alert('Error', 'Failed to update cleaning status');
        } else {
            fetchData();
        }
    };

    const toggleOwnerVerification = async (item: HousekeepingWithDetails) => {
        if (profile?.role !== 'owner') {
            Alert.alert('Permission Denied', 'Only owners can verify cleaning');
            return;
        }

        const { error } = await supabase
            .from('housekeeping')
            .update({ verified_by_owner: !item.verified_by_owner })
            .eq('id', item.id);

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

    if (properties.length === 0) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50 p-8">
                <Text className="text-6xl mb-4">🧹</Text>
                <Text className="text-xl font-bold text-gray-800 text-center">
                    No Properties Yet
                </Text>
                <Text className="text-gray-500 text-center mt-2">
                    Add properties and bookings first
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

                {housekeepingItems.length === 0 ? (
                    <View className="bg-white rounded-xl p-6 items-center">
                        <Text className="text-6xl mb-2">✨</Text>
                        <Text className="text-gray-500 text-center">
                            No housekeeping tasks. They are created automatically when bookings end.
                        </Text>
                    </View>
                ) : (
                    housekeepingItems.map((item) => (
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
                                        Checkout: {item.booking?.check_out ? new Date(item.booking.check_out).toLocaleDateString() : 'N/A'}
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

                                {profile?.role === 'owner' && item.is_clean && (
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
                    ))
                )}
            </View>
        </ScrollView>
    );
}
