import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
    Notification,
    fetchNotifications,
    getUnreadCount,
    markAsRead as markNotificationAsRead,
    markAllAsRead as markAllNotificationsAsRead,
} from './notificationService';
import { useAuth } from './auth';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    refreshNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const refreshNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [notifs, count] = await Promise.all([
                fetchNotifications(),
                getUnreadCount(),
            ]);
            setNotifications(notifs);
            setUnreadCount(count);
        } catch (error) {
            console.error('Error refreshing notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const markAsRead = useCallback(async (notificationId: string) => {
        const success = await markNotificationAsRead(notificationId);
        if (success) {
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        const success = await markAllNotificationsAsRead();
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    }, []);

    // Refresh when user changes (login/logout)
    useEffect(() => {
        refreshNotifications();
    }, [refreshNotifications]);

    // Periodic polling to check for notifications that have become due
    // This runs every 30 seconds while the app is in the foreground
    useEffect(() => {
        if (!user) return;

        // Initial check
        refreshNotifications();

        // Set up polling interval (30 seconds)
        const pollInterval = setInterval(() => {
            // Only refresh if app is active (not in background)
            if (AppState.currentState === 'active') {
                refreshNotifications();
            }
        }, 30000); // 30 seconds

        return () => clearInterval(pollInterval);
    }, [user, refreshNotifications]);

    // Refresh when app comes to foreground
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                refreshNotifications();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [refreshNotifications]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                refreshNotifications,
                markAsRead,
                markAllAsRead,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
