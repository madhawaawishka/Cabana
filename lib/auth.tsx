import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, setAuthToken, User } from './api';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Load token and verify session on mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                const storedToken = await AsyncStorage.getItem(TOKEN_KEY);

                if (storedToken) {
                    setAuthToken(storedToken);

                    // Verify token is still valid
                    const { data, error } = await authApi.verify();

                    if (data && !error) {
                        setUser(data.user);
                    } else {
                        // Token invalid, clear it
                        await AsyncStorage.removeItem(TOKEN_KEY);
                        setAuthToken(null);
                    }
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await authApi.login(email, password);

        if (error) {
            return { error: new Error(error) };
        }

        if (data) {
            await AsyncStorage.setItem(TOKEN_KEY, data.token);
            setAuthToken(data.token);
            setUser(data.user);
        }

        return { error: null };
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        const { data, error } = await authApi.register(email, password, fullName);

        if (error) {
            return { error: new Error(error) };
        }

        if (data) {
            await AsyncStorage.setItem(TOKEN_KEY, data.token);
            setAuthToken(data.token);
            setUser(data.user);
        }

        return { error: null };
    };

    const signOut = async () => {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        setUser(null);
    };

    const refreshProfile = async () => {
        const { data } = await authApi.getProfile();
        if (data) {
            setUser(data.user);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signIn,
            signUp,
            signOut,
            refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Re-export Profile type as alias for User for backwards compatibility
export type Profile = User;
