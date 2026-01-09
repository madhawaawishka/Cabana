import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../lib/auth";
import { View, ActivityIndicator } from "react-native";

export default function AuthLayout() {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    // Redirect to tabs if already authenticated
    if (session) {
        return <Redirect href="/(tabs)" />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}
