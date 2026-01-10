import React, { useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useNotifications } from '../lib/NotificationContext';
import { Notification } from '../lib/notificationService';

export default function NotificationsScreen() {
    const { notifications, loading, refreshNotifications, markAsRead, markAllAsRead } = useNotifications();

    const handleNotificationPress = useCallback(async (notification: Notification) => {
        // Mark as read if not already
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        // Navigate to booking if there's a booking_id
        if (notification.booking_id) {
            router.push(`/booking/${notification.booking_id}`);
        }
    }, [markAsRead]);

    const renderNotification = ({ item }: { item: Notification }) => {
        const isCheckIn = item.type === 'check_in';
        const backgroundColor = item.is_read ? '#F9FAFB' : '#EEF2FF';
        const borderColor = isCheckIn ? '#4F46E5' : '#10B981';

        return (
            <TouchableOpacity
                style={[styles.notificationCard, { backgroundColor, borderLeftColor: borderColor }]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                    <Text style={styles.notificationTime}>
                        {item.scheduled_for
                            ? new Date(item.scheduled_for).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                            })
                            : new Date(item.created_at).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                            })
                        }
                    </Text>
                </View>
                {!item.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    const hasUnread = notifications.some(n => !n.is_read);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen
                options={{
                    title: 'Notifications',
                    headerStyle: { backgroundColor: '#4F46E5' },
                    headerTintColor: '#FFFFFF',
                    headerRight: () => hasUnread ? (
                        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                            <Text style={styles.markAllText}>Mark all read</Text>
                        </TouchableOpacity>
                    ) : null,
                }}
            />

            {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🔔</Text>
                    <Text style={styles.emptyTitle}>No Notifications</Text>
                    <Text style={styles.emptySubtitle}>
                        You'll see check-in and check-out reminders here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotification}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={refreshNotifications}
                            colors={['#4F46E5']}
                            tintColor="#4F46E5"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    notificationCard: {
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        marginBottom: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 8,
    },
    notificationTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4F46E5',
        marginLeft: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    markAllButton: {
        marginRight: 16,
    },
    markAllText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
});
