import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

export const getAuthToken = () => authToken;

// API request helper
const apiRequest = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<{ data?: T; error?: string }> => {
    try {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        if (authToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const json = await response.json();

        if (!response.ok) {
            return { error: json.error || 'Request failed' };
        }

        return { data: json.data !== undefined ? json.data : json };
    } catch (error) {
        console.error('API request error:', error);
        return { error: 'Network error' };
    }
};

// ==================== AUTH API ====================

export const authApi = {
    register: (email: string, password: string, full_name: string) =>
        apiRequest<{ user: User; token: string }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, full_name }),
        }),

    login: (email: string, password: string) =>
        apiRequest<{ user: User; token: string }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    verify: () => apiRequest<{ valid: boolean; user: User }>('/api/auth/verify'),

    getProfile: () => apiRequest<{ user: User }>('/api/auth/me'),

    updateProfile: (updates: Partial<User>) =>
        apiRequest<{ user: User }>('/api/auth/me', {
            method: 'PATCH',
            body: JSON.stringify(updates),
        }),
};

// ==================== PROPERTIES API ====================

export const propertiesApi = {
    getAll: () => apiRequest<Property[]>('/api/properties'),

    getById: (id: string) =>
        apiRequest<Property & { bookings: Booking[] }>(`/api/properties/${id}`),

    create: (data: { name: string; photo_url?: string | null }) =>
        apiRequest<Property>('/api/properties', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<Property>) =>
        apiRequest<Property>(`/api/properties/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiRequest<{ message: string }>(`/api/properties/${id}`, {
            method: 'DELETE',
        }),
};

// ==================== BOOKINGS API ====================

export const bookingsApi = {
    getAll: () => apiRequest<Booking[]>('/api/bookings'),

    getByProperty: (propertyId: string) =>
        apiRequest<Booking[]>(`/api/bookings/property/${propertyId}`),

    getById: (id: string) => apiRequest<Booking>(`/api/bookings/${id}`),

    create: (data: Omit<Booking, 'id' | 'created_at'>) =>
        apiRequest<Booking>('/api/bookings', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<Booking>) =>
        apiRequest<Booking>(`/api/bookings/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiRequest<{ message: string }>(`/api/bookings/${id}`, {
            method: 'DELETE',
        }),
};

// ==================== HOUSEKEEPING API ====================

export const housekeepingApi = {
    getAll: () => apiRequest<HousekeepingWithDetails[]>('/api/housekeeping'),

    update: (id: string, data: { is_clean?: boolean; verified_by_owner?: boolean }) =>
        apiRequest<HousekeepingWithDetails>(`/api/housekeeping/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
};

// ==================== INVOICES API ====================

export const invoicesApi = {
    getByBooking: (bookingId: string) =>
        apiRequest<Invoice | null>(`/api/invoices/booking/${bookingId}`),

    getById: (id: string) => apiRequest<Invoice>(`/api/invoices/${id}`),

    create: (data: {
        booking_id: string;
        invoice_number: string;
        amount: number;
        tax?: number;
        total: number;
        custom_fields?: InvoiceCustomField[];
        pdf_url?: string;
    }) =>
        apiRequest<Invoice>('/api/invoices', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<Invoice>) =>
        apiRequest<Invoice>(`/api/invoices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
};

// ==================== NOTIFICATIONS API ====================

export const notificationsApi = {
    getAll: () => apiRequest<Notification[]>('/api/notifications'),

    getUnreadCount: () =>
        apiRequest<{ count: number }>('/api/notifications/unread-count'),

    create: (data: {
        booking_id?: string;
        type: 'check_in' | 'check_out';
        title: string;
        message: string;
        scheduled_for?: string;
    }) =>
        apiRequest<Notification>('/api/notifications', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    markAsRead: (id: string) =>
        apiRequest<Notification>(`/api/notifications/${id}/read`, {
            method: 'PATCH',
        }),

    markAllAsRead: () =>
        apiRequest<{ message: string }>('/api/notifications/read-all', {
            method: 'PATCH',
        }),

    delete: (id: string) =>
        apiRequest<{ message: string }>(`/api/notifications/${id}`, {
            method: 'DELETE',
        }),

    deleteByBooking: (bookingId: string) =>
        apiRequest<{ message: string }>(`/api/notifications/booking/${bookingId}`, {
            method: 'DELETE',
        }),
};

// ==================== UPLOAD API ====================

export const uploadApi = {
    uploadImage: async (uri: string): Promise<{ url?: string; error?: string }> => {
        try {
            const formData = new FormData();

            // Get file extension
            const uriParts = uri.split('.');
            const fileType = uriParts[uriParts.length - 1];

            formData.append('image', {
                uri,
                name: `photo.${fileType}`,
                type: `image/${fileType}`,
            } as any);

            const response = await fetch(`${API_URL}/api/upload/image`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
                body: formData,
            });

            const json = await response.json();

            if (!response.ok) {
                return { error: json.error || 'Upload failed' };
            }

            return { url: json.url };
        } catch (error) {
            console.error('Upload error:', error);
            return { error: 'Upload failed' };
        }
    },
};

// ==================== TYPES ====================

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'owner' | 'cleaner';
    subscription_tier: 'free' | 'monthly' | 'annual';
    subscription_expires_at: string | null;
    created_at: string;
}

export interface Property {
    id: string;
    owner_id: string;
    name: string;
    photo_url: string | null;
    created_at: string;
}

export interface Booking {
    id: string;
    property_id: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    check_in_date: string;
    check_out_date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    total_amount: number | null;
    is_paid: boolean;
    color: string;
    notes: string | null;
    created_at: string;
    property?: Property;
}

export interface Housekeeping {
    id: string;
    property_id: string;
    booking_id: string;
    is_clean: boolean;
    cleaned_by: string | null;
    cleaned_at: string | null;
    verified_by_owner: boolean;
    created_at: string;
}

export interface HousekeepingWithDetails extends Housekeeping {
    property?: { id: string; name: string };
    booking?: { id: string; customer_name: string; check_out_date: string };
}

export interface InvoiceCustomField {
    id: string;
    name: string;
    amount: number;
    type: 'add' | 'subtract';
}

export interface Invoice {
    id: string;
    booking_id: string;
    invoice_number: string;
    amount: number;
    tax?: number;
    total: number;
    custom_fields?: InvoiceCustomField[];
    status?: 'draft' | 'sent' | 'paid' | 'cancelled';
    pdf_url: string | null;
    created_at: string;
    booking?: Booking;
}

export interface Notification {
    id: string;
    user_id: string;
    booking_id: string | null;
    type: 'check_in' | 'check_out';
    title: string;
    message: string;
    is_read: boolean;
    scheduled_for: string | null;
    created_at: string;
}

// Helper function to generate unique color for customer
export const generateCustomerColor = (customerName: string): string => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF4500',
    ];
    const hash = customerName.split('').reduce((acc, char) =>
        char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return colors[Math.abs(hash) % colors.length];
};
