import { Alert } from 'react-native';

/**
 * Centralized error message utility for user-friendly error handling
 */

interface ErrorResult {
    title: string;
    message: string;
}

type ErrorContext = 'booking' | 'property' | 'invoice' | 'auth' | 'housekeeping' | 'general';

/**
 * Parse Supabase/PostgreSQL errors into user-friendly messages
 */
export const getSupabaseErrorMessage = (error: any, context: ErrorContext = 'general'): ErrorResult => {
    const errorCode = error?.code;
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorDetails = error?.details?.toLowerCase() || '';

    // Not-null violation (23502) - missing required fields
    if (errorCode === '23502') {
        return getNotNullViolationMessage(errorMessage, errorDetails, context);
    }

    // Foreign key violation (23503) - invalid reference
    if (errorCode === '23503') {
        return {
            title: '🔗 Invalid Reference',
            message: 'The selected item may no longer exist. Please refresh and try again.'
        };
    }

    // Unique violation (23505) - duplicate entry
    if (errorCode === '23505') {
        if (context === 'booking') {
            return {
                title: '📅 Booking Conflict',
                message: 'A booking already exists for these dates. Please choose different dates.'
            };
        }
        return {
            title: '⚠️ Already Exists',
            message: 'This item already exists. Please try a different value.'
        };
    }

    // Check constraint violation (23514)
    if (errorCode === '23514') {
        if (errorMessage.includes('amount') || errorDetails.includes('amount')) {
            return {
                title: '💰 Invalid Amount',
                message: 'Please enter a valid amount greater than zero.'
            };
        }
        if (errorMessage.includes('date') || errorDetails.includes('date')) {
            return {
                title: '📅 Invalid Dates',
                message: 'Please check that your dates are correct.'
            };
        }
        return {
            title: '⚠️ Invalid Data',
            message: 'Some values are invalid. Please check your entries and try again.'
        };
    }

    // RLS policy violation
    if (errorCode === '42501' || errorMessage.includes('row-level security')) {
        return {
            title: '🔒 Permission Denied',
            message: 'You don\'t have permission for this action. Please try logging in again.'
        };
    }

    // Network/connection errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
        return {
            title: '📶 Connection Error',
            message: 'Unable to connect. Please check your internet connection and try again.'
        };
    }

    // Default fallback based on context
    return getDefaultErrorMessage(context);
};

/**
 * Get context-specific messages for not-null violations
 */
const getNotNullViolationMessage = (errorMessage: string, errorDetails: string, context: ErrorContext): ErrorResult => {
    const combined = `${errorMessage} ${errorDetails}`;

    if (combined.includes('total_amount')) {
        return { title: '💰 Missing Amount', message: 'Please add a total amount to complete the booking.' };
    }
    if (combined.includes('customer_name')) {
        return { title: '👤 Missing Customer', message: 'Please enter the customer name to continue.' };
    }
    if (combined.includes('check_in')) {
        return { title: '📅 Missing Check-in Date', message: 'Please select a check-in date.' };
    }
    if (combined.includes('check_out')) {
        return { title: '📅 Missing Check-out Date', message: 'Please select a check-out date.' };
    }
    if (combined.includes('property')) {
        return { title: '🏠 Missing Property', message: 'Please select a property.' };
    }
    if (combined.includes('name')) {
        return { title: '📝 Name Required', message: 'Please enter a name to continue.' };
    }

    return { title: '📝 Missing Information', message: 'Please fill in all required fields.' };
};

/**
 * Get default error messages based on context
 */
const getDefaultErrorMessage = (context: ErrorContext): ErrorResult => {
    switch (context) {
        case 'booking':
            return { title: '❌ Booking Failed', message: 'Something went wrong. Please try again.' };
        case 'property':
            return { title: '❌ Property Error', message: 'Something went wrong. Please try again.' };
        case 'invoice':
            return { title: '❌ Invoice Error', message: 'Something went wrong. Please try again.' };
        case 'auth':
            return { title: '❌ Authentication Failed', message: 'Please check your credentials and try again.' };
        case 'housekeeping':
            return { title: '❌ Update Failed', message: 'Something went wrong. Please try again.' };
        default:
            return { title: '❌ Error', message: 'Something went wrong. Please try again.' };
    }
};

/**
 * Parse authentication-specific errors
 */
export const getAuthErrorMessage = (error: any): ErrorResult => {
    const errorMessage = error?.message?.toLowerCase() || '';

    if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid email or password')) {
        return { title: '🔐 Login Failed', message: 'Invalid email or password. Please try again.' };
    }
    if (errorMessage.includes('email not confirmed')) {
        return { title: '📧 Email Not Verified', message: 'Please check your email and verify your account.' };
    }
    if (errorMessage.includes('user already registered') || errorMessage.includes('already exists')) {
        return { title: '👤 Account Exists', message: 'An account with this email already exists. Try signing in.' };
    }
    if (errorMessage.includes('password') && errorMessage.includes('weak')) {
        return { title: '🔐 Weak Password', message: 'Please use a stronger password with at least 6 characters.' };
    }
    if (errorMessage.includes('invalid email')) {
        return { title: '📧 Invalid Email', message: 'Please enter a valid email address.' };
    }
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        return { title: '⏳ Too Many Attempts', message: 'Please wait a moment before trying again.' };
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return { title: '📶 Connection Error', message: 'Unable to connect. Please check your internet.' };
    }

    return { title: '❌ Authentication Error', message: error?.message || 'Something went wrong. Please try again.' };
};

/**
 * Show an error alert with consistent styling
 */
export const showError = (title: string, message: string, onDismiss?: () => void) => {
    Alert.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
};

/**
 * Show a success alert with consistent styling
 */
export const showSuccess = (title: string, message: string, onDismiss?: () => void) => {
    Alert.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
};

/**
 * Show a confirmation dialog
 */
export const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel',
    destructive: boolean = false
) => {
    Alert.alert(title, message, [
        { text: cancelText, style: 'cancel' },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm }
    ]);
};
