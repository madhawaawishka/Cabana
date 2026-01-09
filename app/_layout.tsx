import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../lib/auth";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
    return (
        <AuthProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="property/[id]" options={{ headerShown: true, title: "Property Details" }} />
                <Stack.Screen name="property/add" options={{ headerShown: true, title: "Add Property" }} />
                <Stack.Screen name="booking/[id]" options={{ headerShown: true, title: "Booking Details" }} />
                <Stack.Screen name="booking/add" options={{ headerShown: true, title: "New Booking" }} />
                <Stack.Screen name="invoice/[id]" options={{ headerShown: true, title: "Invoice" }} />
            </Stack>
        </AuthProvider>
    );
}
