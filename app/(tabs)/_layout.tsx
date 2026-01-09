import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../lib/auth";
import { View, ActivityIndicator, Text } from "react-native";

export default function TabsLayout() {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    // Redirect to login if not authenticated
    if (!session) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                tabBarActiveTintColor: "#4F46E5",
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarStyle: {
                    backgroundColor: "#FFFFFF",
                    borderTopWidth: 1,
                    borderTopColor: "#E5E7EB",
                    paddingTop: 8,
                    paddingBottom: 8,
                    height: 64,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "600",
                },
                headerStyle: {
                    backgroundColor: "#4F46E5",
                },
                headerTintColor: "#FFFFFF",
                headerTitleStyle: {
                    fontWeight: "bold",
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Properties",
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 24, color }}>🏠</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: "Calendar",
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 24, color }}>📅</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="housekeeping"
                options={{
                    title: "Housekeeping",
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 24, color }}>🧹</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: "Reports",
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 24, color }}>📊</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 24, color }}>⚙️</Text>
                    ),
                }}
            />
        </Tabs>
    );
}
