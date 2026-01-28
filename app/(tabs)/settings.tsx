import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';

export default function SettingsScreen() {
    const { user, profile, signOut } = useAuth();

    const handleSignOut = () => {
        Alert.alert(
            '👋 Sign Out',
            'Are you sure you want to sign out of your account?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    };

    const getSubscriptionBadge = () => {
        switch (profile?.subscription_tier) {
            case 'annual':
                return { text: 'Annual Pro', color: '#8B5CF6' };
            case 'monthly':
                return { text: 'Monthly Pro', color: '#3B82F6' };
            default:
                return { text: 'Free Plan', color: '#6B7280' };
        }
    };

    const badge = getSubscriptionBadge();

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Profile Card */}
            <View className="bg-white mx-4 mt-4 rounded-2xl p-6">
                <View className="items-center">
                    <View className="w-24 h-24 rounded-full bg-indigo-100 items-center justify-center mb-4">
                        <Text className="text-4xl">👤</Text>
                    </View>
                    <Text className="text-xl font-bold text-gray-800">
                        {profile?.full_name || 'User'}
                    </Text>
                    <Text className="text-gray-500">{user?.email}</Text>
                    <View className="px-4 py-1 rounded-full mt-3" style={{ backgroundColor: badge.color }}>
                        <Text className="text-white font-medium">{badge.text}</Text>
                    </View>
                </View>
            </View>

            {/* Subscription Section */}
            <View className="mx-4 mt-6">
                <Text className="text-lg font-bold text-gray-800 mb-3">Subscription</Text>

                {profile?.subscription_tier === 'free' ? (
                    <TouchableOpacity activeOpacity={0.9}>
                        <LinearGradient
                            colors={['#4F46E5', '#7C3AED']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ borderRadius: 16, padding: 24 }}
                        >
                            <Text className="text-white text-xl font-bold mb-2">Upgrade to Pro</Text>
                            <Text className="text-white mb-4" style={{ opacity: 0.8 }}>
                                Unlock unlimited properties, advanced reports, and more!
                            </Text>
                            <View className="flex-row gap-3">
                                <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                    <Text className="text-white font-bold text-lg text-center">$9.99</Text>
                                    <Text className="text-white text-center text-sm" style={{ opacity: 0.8 }}>Monthly</Text>
                                </View>
                                <View className="flex-1 rounded-xl p-3 border-2 border-white" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                                    <Text className="text-white font-bold text-lg text-center">$99.99</Text>
                                    <Text className="text-white text-center text-sm" style={{ opacity: 0.8 }}>Annual (Save 17%)</Text>
                                </View>
                            </View>
                            <Text className="text-white text-center text-xs mt-3" style={{ opacity: 0.6 }}>
                                Stripe integration coming soon
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <View className="bg-white rounded-2xl p-4">
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="font-bold text-gray-800">
                                    {profile?.subscription_tier === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                                </Text>
                                <Text className="text-gray-500 text-sm">
                                    {profile?.subscription_expires_at
                                        ? `Expires: ${new Date(profile.subscription_expires_at).toLocaleDateString()}`
                                        : 'Active'}
                                </Text>
                            </View>
                            <TouchableOpacity className="bg-gray-100 px-4 py-2 rounded-lg">
                                <Text className="text-gray-600 font-medium">Manage</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Settings Options */}
            <View className="mx-4 mt-6">
                <Text className="text-lg font-bold text-gray-800 mb-3">Settings</Text>

                <View className="bg-white rounded-2xl overflow-hidden">
                    <TouchableOpacity
                        className="flex-row items-center p-4 border-b border-gray-100"
                        onPress={() => router.push('/settings/notifications')}
                    >
                        <Text className="text-xl mr-3">🔔</Text>
                        <Text className="flex-1 text-gray-800">Notifications</Text>
                        <Text className="text-gray-400">›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center p-4">
                        <Text className="text-xl mr-3">💳</Text>
                        <Text className="flex-1 text-gray-800">Payment Methods</Text>
                        <Text className="text-gray-400">›</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Support */}
            <View className="mx-4 mt-6">
                <Text className="text-lg font-bold text-gray-800 mb-3">Support</Text>

                <View className="bg-white rounded-2xl overflow-hidden">

                    <TouchableOpacity className="flex-row items-center p-4">
                        <Text className="text-xl mr-3">📧</Text>
                        <Text className="flex-1 text-gray-800">Contact Us</Text>
                        <Text className="text-gray-400">›</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Sign Out */}
            <TouchableOpacity
                className="bg-red-500 mx-4 mt-6 mb-8 py-4 rounded-xl"
                onPress={handleSignOut}
            >
                <Text className="text-white font-bold text-center text-lg">Sign Out</Text>
            </TouchableOpacity>

            {/* App Version */}
            <Text className="text-gray-400 text-center mb-8">Version 1.0.0</Text>
        </ScrollView>
    );
}
