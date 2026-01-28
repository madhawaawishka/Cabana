import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase, Property } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function PropertiesScreen() {
    const { user } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchProperties = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching properties:', error);
        } else {
            setProperties(data || []);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            fetchProperties();
        }, [user])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchProperties();
    };

    const handleDeleteProperty = async (id: string) => {
        Alert.alert(
            '🗑️ Delete Property',
            'Are you sure? This will permanently delete this property and all its bookings.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('properties').delete().eq('id', id);
                        if (error) {
                            Alert.alert('❌ Delete Failed', 'Could not delete this property. Please try again.');
                        } else {
                            fetchProperties();
                        }
                    },
                },
            ]
        );
    };

    const renderProperty = ({ item }: { item: Property }) => (
        <TouchableOpacity
            className="bg-white rounded-2xl overflow-hidden shadow-lg mb-4 mx-4"
            onPress={() => router.push(`/property/${item.id}`)}
            onLongPress={() => handleDeleteProperty(item.id)}
        >
            {item.photo_url ? (
                <Image
                    source={{ uri: item.photo_url }}
                    className="w-full h-48"
                    resizeMode="cover"
                />
            ) : (
                <View className="w-full h-48 bg-indigo-500 items-center justify-center">
                    <Text className="text-6xl">🏨</Text>
                </View>
            )}
            <View className="p-4">
                <Text className="text-xl font-bold text-gray-800">{item.name}</Text>
                <Text className="text-gray-500 text-sm mt-1">
                    Added {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <Text className="text-gray-500">Loading properties...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {properties.length === 0 ? (
                <View className="flex-1 items-center justify-center p-8">
                    <Text className="text-6xl mb-4">🏠</Text>
                    <Text className="text-2xl font-bold text-gray-800 text-center">
                        No Properties Yet
                    </Text>
                    <Text className="text-gray-500 text-center mt-2 mb-6">
                        Add your first villa or room to start managing bookings
                    </Text>
                    <TouchableOpacity
                        className="bg-primary-600 px-8 py-4 rounded-xl"
                        onPress={() => router.push('/property/add')}
                    >
                        <Text className="text-white font-bold text-lg">Add Property</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={properties}
                    renderItem={renderProperty}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingVertical: 16 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListFooterComponent={
                        <TouchableOpacity
                            className="bg-primary-600 mx-4 py-4 rounded-xl mb-4"
                            onPress={() => router.push('/property/add')}
                        >
                            <Text className="text-white font-bold text-lg text-center">
                                + Add New Property
                            </Text>
                        </TouchableOpacity>
                    }
                />
            )}
        </View>
    );
}
