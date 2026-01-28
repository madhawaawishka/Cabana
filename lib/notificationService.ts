import { notificationsApi } from './api';
import { getNotificationSettings } from './notifications';

// Notification type - re-exported from api.ts
export type { Notification } from './api';

// Fetch all notifications for the current user (only those that are due)
export const fetchNotifications = async () => {
    const { data, error } = await notificationsApi.getAll();

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data || [];
};

// Get unread notification count (only those that are due)
export const getUnreadCount = async (): Promise<number> => {
    const { data, error } = await notificationsApi.getUnreadCount();

    if (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }

    return data?.count || 0;
};

// Mark a notification as read
export const markAsRead = async (notificationId: string): Promise<boolean> => {
    const { error } = await notificationsApi.markAsRead(notificationId);

    if (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }

    return true;
};

// Mark all notifications as read
export const markAllAsRead = async (): Promise<boolean> => {
    const { error } = await notificationsApi.markAllAsRead();

    if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
    }

    return true;
};

// Create a check-in notification (scheduled based on reminder settings)
export const createCheckInNotification = async (
    bookingId: string,
    customerName: string,
    propertyName: string,
    checkInDate: string,
    checkInTime?: string | null
): Promise<boolean> => {
    // Get notification settings to determine when to show this notification
    const settings = await getNotificationSettings();

    // Calculate the scheduled time based on check-in date/time and reminder hours
    const checkInDateTime = new Date(checkInDate);
    if (checkInTime) {
        const [hours, minutes] = checkInTime.split(':').map(Number);
        checkInDateTime.setHours(hours, minutes, 0, 0);
    } else {
        checkInDateTime.setHours(14, 0, 0, 0); // Default 2 PM
    }

    const scheduledFor = new Date(
        checkInDateTime.getTime() - settings.checkInReminderHours * 60 * 60 * 1000
    );

    const formattedDate = new Date(checkInDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    // Format check-in time for display
    const formatTimeDisplay = (time: string | null | undefined): string => {
        if (!time) return '2:00 PM';
        const [h, m] = time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 || 12;
        return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const { error } = await notificationsApi.create({
        booking_id: bookingId,
        type: 'check_in',
        title: '📅 Upcoming Check-in',
        message: `${customerName} is checking in to ${propertyName} on ${formattedDate} at ${formatTimeDisplay(checkInTime)}`,
        scheduled_for: scheduledFor.toISOString(),
    });

    if (error) {
        console.error('Error creating check-in notification:', error);
        return false;
    }

    return true;
};

// Create a check-out notification (scheduled based on reminder settings)
export const createCheckOutNotification = async (
    bookingId: string,
    customerName: string,
    propertyName: string,
    checkOutDate: string,
    checkOutTime?: string | null
): Promise<boolean> => {
    // Get notification settings to determine when to show this notification
    const settings = await getNotificationSettings();

    // Calculate the scheduled time based on check-out date/time and reminder hours
    const checkOutDateTime = new Date(checkOutDate);
    if (checkOutTime) {
        const [hours, minutes] = checkOutTime.split(':').map(Number);
        checkOutDateTime.setHours(hours, minutes, 0, 0);
    } else {
        checkOutDateTime.setHours(11, 0, 0, 0); // Default 11 AM
    }

    const scheduledFor = new Date(
        checkOutDateTime.getTime() - settings.checkOutReminderHours * 60 * 60 * 1000
    );

    const formattedDate = new Date(checkOutDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    // Format check-out time for display
    const formatTimeDisplay = (time: string | null | undefined): string => {
        if (!time) return '11:00 AM';
        const [h, m] = time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 || 12;
        return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const { error } = await notificationsApi.create({
        booking_id: bookingId,
        type: 'check_out',
        title: '🏁 Upcoming Check-out',
        message: `${customerName} is checking out from ${propertyName} on ${formattedDate} at ${formatTimeDisplay(checkOutTime)}`,
        scheduled_for: scheduledFor.toISOString(),
    });

    if (error) {
        console.error('Error creating check-out notification:', error);
        return false;
    }

    return true;
};

// Delete notification
export const deleteNotification = async (notificationId: string): Promise<boolean> => {
    const { error } = await notificationsApi.delete(notificationId);

    if (error) {
        console.error('Error deleting notification:', error);
        return false;
    }

    return true;
};

// Delete all notifications for a booking
export const deleteNotificationsByBookingId = async (bookingId: string): Promise<boolean> => {
    const { error } = await notificationsApi.deleteByBooking(bookingId);

    if (error) {
        console.error('Error deleting notifications for booking:', error);
        return false;
    }

    return true;
};
