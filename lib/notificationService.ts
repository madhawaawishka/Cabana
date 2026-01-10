import { supabase } from './supabase';
import { getNotificationSettings } from './notifications';

// Notification type
export interface Notification {
    id: string;
    user_id: string;
    booking_id: string | null;
    type: 'check_in' | 'check_out';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    scheduled_for: string | null;
}

// Fetch all notifications for the current user (only those that are due)
export const fetchNotifications = async (): Promise<Notification[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data || [];
};

// Get unread notification count (only those that are due)
export const getUnreadCount = async (): Promise<number> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const now = new Date().toISOString();

    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .or(`scheduled_for.is.null,scheduled_for.lte.${now}`);

    if (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }

    return count || 0;
};

// Mark a notification as read
export const markAsRead = async (notificationId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }

    return true;
};

// Mark all notifications as read
export const markAllAsRead = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

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

    const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

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

    const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
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
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

    if (error) {
        console.error('Error deleting notification:', error);
        return false;
    }

    return true;
};

// Delete all notifications for a booking
export const deleteNotificationsByBookingId = async (bookingId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('booking_id', bookingId);

    if (error) {
        console.error('Error deleting notifications for booking:', error);
        return false;
    }

    return true;
};
