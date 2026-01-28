import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    NotificationSettings,
    DEFAULT_NOTIFICATION_SETTINGS,
    REMINDER_OPTIONS,
    getNotificationSettings,
    saveNotificationSettings,
    requestNotificationPermissions,
} from '../../lib/notifications';

export default function NotificationSettingsScreen() {
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        loadSettings();
        checkPermissions();
    }, []);

    const loadSettings = async () => {
        const savedSettings = await getNotificationSettings();
        setSettings(savedSettings);
        setLoading(false);
    };

    const checkPermissions = async () => {
        const granted = await requestNotificationPermissions();
        setHasPermission(granted);
        if (!granted) {
            Alert.alert(
                '🔔 Notifications Disabled',
                'Please enable notifications in your device settings to receive booking reminders.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleSave = async () => {
        await saveNotificationSettings(settings);
        Alert.alert('✅ Settings Saved', 'Your notification preferences have been updated.', [
            { text: 'OK', onPress: () => router.back() }
        ]);
    };

    const updateSetting = <K extends keyof NotificationSettings>(
        key: K,
        value: NotificationSettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const getReminderLabel = (hours: number): string => {
        const option = REMINDER_OPTIONS.find(opt => opt.value === hours);
        return option?.label || `${hours} hours before`;
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <Text className="text-gray-500">Loading...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
            <ScrollView className="flex-1">
                {/* Permission Warning */}
                {!hasPermission && (
                    <View className="mx-4 mt-4 p-4 bg-yellow-100 rounded-xl">
                        <Text className="text-yellow-800 font-medium">
                            ⚠️ Notifications are disabled. Enable them in device settings to receive reminders.
                        </Text>
                    </View>
                )}

                {/* Check-in Notifications */}
                <View className="mx-4 mt-6">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Check-in Reminders</Text>
                    <View className="bg-white rounded-2xl overflow-hidden">
                        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                            <View className="flex-1">
                                <Text className="text-gray-800 font-medium">Enable Check-in Reminders</Text>
                                <Text className="text-gray-500 text-sm">Get notified before guest arrivals</Text>
                            </View>
                            <Switch
                                value={settings.checkInEnabled}
                                onValueChange={(value) => updateSetting('checkInEnabled', value)}
                                trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
                                thumbColor={settings.checkInEnabled ? '#4F46E5' : '#f4f3f4'}
                            />
                        </View>

                        {settings.checkInEnabled && (
                            <View className="p-4">
                                <Text className="text-gray-600 mb-3">Remind me:</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {REMINDER_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            className={`px-4 py-2 rounded-full ${settings.checkInReminderHours === option.value
                                                ? 'bg-primary-600'
                                                : 'bg-gray-100'
                                                }`}
                                            onPress={() => updateSetting('checkInReminderHours', option.value)}
                                        >
                                            <Text
                                                className={`font-medium ${settings.checkInReminderHours === option.value
                                                    ? 'text-white'
                                                    : 'text-gray-700'
                                                    }`}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Check-out Notifications */}
                <View className="mx-4 mt-6">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Check-out Reminders</Text>
                    <View className="bg-white rounded-2xl overflow-hidden">
                        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                            <View className="flex-1">
                                <Text className="text-gray-800 font-medium">Enable Check-out Reminders</Text>
                                <Text className="text-gray-500 text-sm">Get notified before guest departures</Text>
                            </View>
                            <Switch
                                value={settings.checkOutEnabled}
                                onValueChange={(value) => updateSetting('checkOutEnabled', value)}
                                trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
                                thumbColor={settings.checkOutEnabled ? '#4F46E5' : '#f4f3f4'}
                            />
                        </View>

                        {settings.checkOutEnabled && (
                            <View className="p-4">
                                <Text className="text-gray-600 mb-3">Remind me:</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {REMINDER_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            className={`px-4 py-2 rounded-full ${settings.checkOutReminderHours === option.value
                                                ? 'bg-primary-600'
                                                : 'bg-gray-100'
                                                }`}
                                            onPress={() => updateSetting('checkOutReminderHours', option.value)}
                                        >
                                            <Text
                                                className={`font-medium ${settings.checkOutReminderHours === option.value
                                                    ? 'text-white'
                                                    : 'text-gray-700'
                                                    }`}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Info Card */}
                <View className="mx-4 mt-6 p-4 bg-blue-50 rounded-xl">
                    <Text className="text-blue-800 text-sm">
                        💡 Notifications will be scheduled automatically when you create or update bookings.
                    </Text>
                </View>
            </ScrollView>

            {/* Save Button */}
            <View className="p-4">
                <TouchableOpacity
                    className="bg-primary-600 py-4 rounded-xl"
                    onPress={handleSave}
                >
                    <Text className="text-white font-bold text-lg text-center">Save Settings</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
