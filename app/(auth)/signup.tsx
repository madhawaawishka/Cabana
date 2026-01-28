import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { getAuthErrorMessage } from '../../lib/errorMessages';

export default function SignupScreen() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();

    const handleSignup = async () => {
        if (!fullName.trim()) {
            Alert.alert('👤 Name Required', 'Please enter your full name.');
            return;
        }

        if (!email.trim()) {
            Alert.alert('📧 Email Required', 'Please enter your email address.');
            return;
        }

        if (!password) {
            Alert.alert('🔐 Password Required', 'Please create a password for your account.');
            return;
        }

        if (!confirmPassword) {
            Alert.alert('🔐 Confirm Password', 'Please confirm your password.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('🔐 Password Mismatch', 'Your passwords don\'t match. Please try again.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('🔐 Weak Password', 'Please use at least 6 characters for better security.');
            return;
        }

        setLoading(true);
        const { error } = await signUp(email, password, fullName);
        setLoading(false);

        if (error) {
            const { title, message } = getAuthErrorMessage(error);
            Alert.alert(title, message);
        } else {
            Alert.alert(
                '🎉 Welcome!',
                'Your account has been created successfully!',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
            );
        }
    };

    return (
        <LinearGradient
            colors={['#0D9488', '#115E59']}
            style={{ flex: 1 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View className="flex-1 justify-center px-8 py-12">
                        {/* Header */}
                        <View className="mb-8">
                            <Text className="text-5xl font-bold text-white text-center mb-2">
                                🏨
                            </Text>
                            <Text className="text-3xl font-bold text-white text-center">
                                Create Account
                            </Text>
                            <Text className="text-white text-center mt-2" style={{ opacity: 0.8 }}>
                                Start managing your properties today
                            </Text>
                        </View>

                        {/* Signup Card */}
                        <View className="bg-white rounded-3xl p-8">
                            <View className="mb-4">
                                <Text className="text-gray-600 mb-2 font-medium">Full Name</Text>
                                <TextInput
                                    className="bg-gray-100 rounded-xl px-4 py-4 text-gray-800"
                                    placeholder="Enter your full name"
                                    placeholderTextColor="#9CA3AF"
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>

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

                            <View className="mb-4">
                                <Text className="text-gray-600 mb-2 font-medium">Password</Text>
                                <TextInput
                                    className="bg-gray-100 rounded-xl px-4 py-4 text-gray-800"
                                    placeholder="Create a password"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-600 mb-2 font-medium">Confirm Password</Text>
                                <TextInput
                                    className="bg-gray-100 rounded-xl px-4 py-4 text-gray-800"
                                    placeholder="Confirm your password"
                                    placeholderTextColor="#9CA3AF"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />
                            </View>

                            <TouchableOpacity
                                className="bg-teal-600 rounded-xl py-4"
                                style={{ opacity: loading ? 0.7 : 1 }}
                                onPress={handleSignup}
                                disabled={loading}
                            >
                                <Text className="text-white text-center font-bold text-lg">
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </Text>
                            </TouchableOpacity>

                            <View className="flex-row justify-center mt-6">
                                <Text className="text-gray-600">Already have an account? </Text>
                                <Link href="/(auth)/login" asChild>
                                    <TouchableOpacity>
                                        <Text className="text-teal-600 font-bold">Sign In</Text>
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
