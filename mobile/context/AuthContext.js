import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFeaturePermissions } from '../services/settings.api';
import { getCurrentUser } from '../services/user.api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [permissions, setPermissions] = useState([]);

    const fetchPermissions = async () => {
        const response = await getFeaturePermissions();
        if (response.success) {
            setPermissions(response.data.permissions);
        }
    };

    const initAuth = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                // Verify with backend
                try {
                    const userResponse = await getCurrentUser();
                    if (userResponse.success && userResponse.data) {
                        setUser(userResponse.data);
                        await AsyncStorage.setItem('user', JSON.stringify(userResponse.data));
                    } else {
                        // Token invalid/expired
                        setUser(null);
                        await AsyncStorage.removeItem('user');
                    }
                } catch (e) {
                    console.log("Failed to refresh user, using stored data", e);
                    setUser(parsedUser);
                }
            }
        } catch (e) {
            console.error("Auth init error", e);
        } finally {
            await fetchPermissions();
            setIsLoading(false);
        }
    };

    useEffect(() => {
        initAuth();
    }, []);

    const login = async (userData, accessToken) => {
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        if (accessToken) {
            await AsyncStorage.setItem('accessToken', accessToken);
        }
        await fetchPermissions();
    };

    const logout = async () => {
        setUser(null);
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('accessToken');
    };

    const hasPermission = (feature) => {
        if (!user) return false;
        const permission = permissions.find(p => p.feature === feature);
        if (!permission) return false;
        return permission.roles.includes(user.role);
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isAuthenticated: !!user,
            isLoading,
            permissions,
            hasPermission
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
