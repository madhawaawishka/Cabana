import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase, generateCustomerColor } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function AddPropertyScreen() {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string): Promise<string | null> => {
        try {
            setUploading(true);

            const response = await fetch(uri);
            const blob = await response.blob();

            const fileExt = uri.split('.').pop() || 'jpg';
            const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('property-images')
                .upload(fileName, blob);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                return null;
            }

            const { data } = supabase.storage
                .from('property-images')
                .getPublicUrl(fileName);

            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a property name');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be logged in');
            return;
        }

        setLoading(true);

        let imageUrl = null;
        if (image) {
            imageUrl = await uploadImage(image);
        }

        const { error } = await supabase.from('properties').insert({
            owner_id: user.id,
            name: name.trim(),
        });

        setLoading(false);

        if (error) {
            Alert.alert('Error', 'Failed to create property. Please try again.');
            console.error('Error creating property:', error);
        } else {
            Alert.alert('Success', 'Property created successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-gray-50"
        >
            <ScrollView className="flex-1 p-4">
                {/* Image Picker */}
                <TouchableOpacity
                    className="bg-white rounded-2xl overflow-hidden shadow-sm mb-6"
                    onPress={pickImage}
                >
                    {image ? (
                        <Image source={{ uri: image }} className="w-full h-48" resizeMode="cover" />
                    ) : (
                        <View className="w-full h-48 bg-gray-100 items-center justify-center">
                            <Text className="text-5xl mb-2">📷</Text>
                            <Text className="text-gray-500 font-medium">Tap to add photo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Property Name */}
                <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                    <Text className="text-gray-600 mb-2 font-medium">Property Name</Text>
                    <TextInput
                        className="bg-gray-100 rounded-xl px-4 py-4 text-gray-800 text-lg"
                        placeholder="e.g., Beach Villa, Room 101"
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                {/* Tips */}
                <View className="bg-primary-50 rounded-2xl p-4 mb-6">
                    <Text className="text-primary-800 font-bold mb-2">💡 Tips</Text>
                    <Text className="text-primary-600">
                        • Use descriptive names for easy identification{'\n'}
                        • Add a photo to help guests recognize the property{'\n'}
                        • You can long-press a property to delete it later
                    </Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    className={`bg-primary-600 py-4 rounded-xl mb-8 ${(loading || uploading) ? 'opacity-70' : ''}`}
                    onPress={handleSave}
                    disabled={loading || uploading}
                >
                    <Text className="text-white font-bold text-lg text-center">
                        {uploading ? 'Uploading Image...' : loading ? 'Creating...' : 'Create Property'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
