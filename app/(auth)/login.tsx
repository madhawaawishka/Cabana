import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useAuth } from '../../lib/auth';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        const { error } = await signIn(email, password);
        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            router.replace('/(tabs)');
        }
    };

    return (
        <LinearGradient
            colors={['#4F46E5', '#3730A3']}
            style={{ flex: 1 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View className="flex-1 justify-center px-8 py-12">
                        {/* Header */}
                        <View className="mb-12">
                            <Text className="text-5xl font-bold text-white text-center mb-2">
                                🏨
                            </Text>
                            <Text className="text-3xl font-bold text-white text-center">
                                Villa Booking
                            </Text>
                            <Text className="text-white text-center mt-2" style={{ opacity: 0.8 }}>
                                Manage your properties with ease
                            </Text>
                        </View>

                        {/* Login Card */}
                        <View className="bg-white rounded-3xl p-8">
                            <Text className="text-2xl font-bold text-gray-800 mb-6">
                                Welcome Back
                            </Text>

                            <View className="mb-4">
                                <Text className="text-gray-600 mb-2 font-medium">Email</Text>
                                <TextInput
                                    className="bg-gray-100 rounded-xl px-4 py-4 text-gray-800"
                                    placeholder="Enter your email"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-600 mb-2 font-medium">Password</Text>
                                <TextInput
                                    className="bg-gray-100 rounded-xl px-4 py-4 text-gray-800"
                                    placeholder="Enter your password"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            <TouchableOpacity
                                className="bg-indigo-600 rounded-xl py-4"
                                style={{ opacity: loading ? 0.7 : 1 }}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                <Text className="text-white text-center font-bold text-lg">
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </Text>
                            </TouchableOpacity>

                            <View className="flex-row justify-center mt-6">
                                <Text className="text-gray-600">Don't have an account? </Text>
                                <Link href="/(auth)/signup" asChild>
                                    <TouchableOpacity>
                                        <Text className="text-indigo-600 font-bold">Sign Up</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}
