import AsyncStorage from '@react-native-async-storage/async-storage';
import { Booking } from './supabase';
import Constants from 'expo-constants';

// Check if we're running in Expo Go (where push notifications aren't supported since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy import expo-notifications to avoid errors in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;

// Initialize notifications module (call this before using notification features)
const initNotificationsModule = async (): Promise<boolean> => {
    if (isExpoGo) {
        console.log('Push notifications are not supported in Expo Go. Using database-backed notifications only.');
        return false;
    }

    if (!Notifications) {
        try {
            Notifications = await import('expo-notifications');
            // Configure how notifications are handled when the app is in foreground
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });
            return true;
        } catch (error) {
            console.warn('Failed to load expo-notifications:', error);
            return false;
        }
    }
    return true;
};

// Notification settings interface
export interface NotificationSettings {
    checkInEnabled: boolean;
    checkOutEnabled: boolean;
    checkInReminderHours: number; // Hours before check-in
    checkOutReminderHours: number; // Hours before check-out
}

// Default settings
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    checkInEnabled: true,
    checkOutEnabled: true,
    checkInReminderHours: 24, // 1 day before
    checkOutReminderHours: 24, // 1 day before
};

// Reminder time options (in hours, with fractional values for minutes)
export const REMINDER_OPTIONS = [
    { label: '2 min before', value: 2 / 60 }, // ~0.033 hours
    { label: '3 min before', value: 3 / 60 }, // 0.05 hours
    { label: '1 hour before', value: 1 },
    { label: '6 hours before', value: 6 },
    { label: '12 hours before', value: 12 },
    { label: '1 day before', value: 24 },
    { label: '2 days before', value: 48 },
    { label: '3 days before', value: 72 },
    { label: '1 week before', value: 168 },
];

const SETTINGS_STORAGE_KEY = '@notification_settings';
const NOTIFICATION_IDS_KEY = '@scheduled_notification_ids';

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
    const initialized = await initNotificationsModule();
    if (!initialized || !Notifications) {
        // In Expo Go, we can't request push notification permissions
        // but the app will still work with database-backed notifications
        return true; // Return true so the app continues to function
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
};

// Get notification settings from storage
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
    try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('Error loading notification settings:', error);
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
};

// Save notification settings to storage
export const saveNotificationSettings = async (settings: NotificationSettings): Promise<void> => {
    try {
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving notification settings:', error);
    }
};

// Store scheduled notification IDs for a booking
const storeNotificationIds = async (bookingId: string, notificationIds: string[]): Promise<void> => {
    try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
        const allIds = stored ? JSON.parse(stored) : {};
        allIds[bookingId] = notificationIds;
        await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(allIds));
    } catch (error) {
        console.error('Error storing notification IDs:', error);
    }
};

// Get stored notification IDs for a booking
const getStoredNotificationIds = async (bookingId: string): Promise<string[]> => {
    try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
        if (stored) {
            const allIds = JSON.parse(stored);
            return allIds[bookingId] || [];
        }
    } catch (error) {
        console.error('Error getting notification IDs:', error);
    }
    return [];
};

// Remove stored notification IDs for a booking
const removeStoredNotificationIds = async (bookingId: string): Promise<void> => {
    try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
        if (stored) {
            const allIds = JSON.parse(stored);
            delete allIds[bookingId];
            await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(allIds));
        }
    } catch (error) {
        console.error('Error removing notification IDs:', error);
    }
};

// Schedule notifications for a booking
// Note: Local push notifications only work in development builds, not Expo Go
// The database-backed notifications (via notificationService.ts) work everywhere
export const scheduleBookingNotifications = async (
    booking: Booking,
    propertyName: string
): Promise<void> => {
    const initialized = await initNotificationsModule();
    if (!initialized || !Notifications) {
        // In Expo Go, skip local push notification scheduling
        // Database-backed notifications will still work
        return;
    }

    const settings = await getNotificationSettings();
    const notificationIds: string[] = [];

    // Cancel any existing notifications for this booking
    await cancelBookingNotifications(booking.id);

    // Helper to combine date and time
    const combineDateAndTime = (dateStr: string, timeStr: string | null): Date => {
        const date = new Date(dateStr);
        if (timeStr) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            date.setHours(hours, minutes, 0, 0);
        } else {
            // Default times if not set
            date.setHours(14, 0, 0, 0); // Default check-in: 2 PM
        }
        return date;
    };

    const checkInDateTime = combineDateAndTime(booking.check_in_date, booking.check_in_time);
    const checkOutDateTime = combineDateAndTime(booking.check_out_date, booking.check_out_time);
    const now = new Date();

    // Schedule check-in reminder
    if (settings.checkInEnabled) {
        const checkInReminderTime = new Date(
            checkInDateTime.getTime() - settings.checkInReminderHours * 60 * 60 * 1000
        );

        if (checkInReminderTime > now) {
            const id = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '📅 Upcoming Check-in',
                    body: `${booking.customer_name} is checking in to ${propertyName} on ${checkInDateTime.toLocaleDateString()} at ${booking.check_in_time || '2:00 PM'}`,
                    data: { bookingId: booking.id, type: 'check_in' },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: checkInReminderTime,
                },
            });
            notificationIds.push(id);
        }
    }

    // Schedule check-out reminder
    if (settings.checkOutEnabled) {
        const checkOutReminderTime = new Date(
            checkOutDateTime.getTime() - settings.checkOutReminderHours * 60 * 60 * 1000
        );

        if (checkOutReminderTime > now) {
            const id = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🏁 Upcoming Check-out',
                    body: `${booking.customer_name} is checking out from ${propertyName} on ${checkOutDateTime.toLocaleDateString()} at ${booking.check_out_time || '11:00 AM'}`,
                    data: { bookingId: booking.id, type: 'check_out' },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: checkOutReminderTime,
                },
            });
            notificationIds.push(id);
        }
    }

    // Store the notification IDs
    if (notificationIds.length > 0) {
        await storeNotificationIds(booking.id, notificationIds);
    }
};

// Cancel notifications for a booking
export const cancelBookingNotifications = async (bookingId: string): Promise<void> => {
    const initialized = await initNotificationsModule();
    const notificationIds = await getStoredNotificationIds(bookingId);

    if (initialized && Notifications) {
        for (const id of notificationIds) {
            await Notifications.cancelScheduledNotificationAsync(id);
        }
    }

    await removeStoredNotificationIds(bookingId);
};

// Cancel all scheduled notifications
export const cancelAllNotifications = async (): Promise<void> => {
    const initialized = await initNotificationsModule();
    if (initialized && Notifications) {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
    await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
};

// Get all scheduled notifications (for debugging)
export const getAllScheduledNotifications = async () => {
    const initialized = await initNotificationsModule();
    if (!initialized || !Notifications) {
        return [];
    }
    return await Notifications.getAllScheduledNotificationsAsync();
};
