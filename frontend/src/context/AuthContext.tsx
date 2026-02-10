/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getFeaturePermissions } from '../services/settings.api';
import { getCurrentUser } from '../services/user.api';
import { FeatureCodes, SUPERADMIN_ROLE_NAME } from "../constants";

// ... existing imports



export interface User {
    _id: string;
    fullName: string;
    email: string;
    username?: string;
    avatar?: string;
    labName?: string;
    designation?: string;
    division?: string;
    mobileNo?: string;
    status: 'Approved' | 'Pending' | 'Rejected';
    initials: string;
    role: 'User' | 'Inter Lab sender' | 'Delegated Admin' | typeof SUPERADMIN_ROLE_NAME;
    availableRoles?: string[];
    isSubmitted?: boolean;
    isActivated?: boolean;
    settings?: {
        theme: 'light' | 'dark' | 'system';
        accentColor: 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber';
        fontSize: 'small' | 'medium' | 'large';
    };
    hasApprovalAuthority?: boolean;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    isPermissionsLoading: boolean;
    permissions: any[];
    hasPermission: (feature: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
    const [permissions, setPermissions] = useState<any[]>([]);

    const fetchPermissions = async () => {
        setIsPermissionsLoading(true);
        const response = await getFeaturePermissions();
        if (response.success) {

            setPermissions(response.data.permissions);
        } else {
            console.error('[AuthContext] Failed to fetch permissions');
        }
        setIsPermissionsLoading(false);
    };

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    JSON.parse(storedUser); // Verify JSON validity
                    // Fetch fresh user data from backend to ensure roles/status are synced
                    try {
                        const userResponse = await getCurrentUser();
                        if (userResponse.success && userResponse.data) {

                            setUser(userResponse.data);
                            // Store public data in localStorage
                            const publicUserData = {
                                _id: userResponse.data._id,
                                fullName: userResponse.data.fullName,
                                email: userResponse.data.email,
                                role: userResponse.data.role,
                                initials: userResponse.data.initials,
                                labName: userResponse.data.labName,
                                designation: userResponse.data.designation,
                                division: userResponse.data.division,
                                status: userResponse.data.status,
                                hasApprovalAuthority: userResponse.data.hasApprovalAuthority
                            };
                            localStorage.setItem('user', JSON.stringify(publicUserData));
                        } else {
                            console.warn('[AuthContext] Session invalid or expired. Clearing local storage.');
                            setUser(null);
                            localStorage.removeItem('user');
                        }
                    } catch (apiError) {
                        console.warn("[AuthContext] Failed to refresh user from backend (Network/API Error)", apiError);
                    }

                } catch (error) {
                    console.error("Failed to parse user from local storage", error);
                    localStorage.removeItem('user');
                }
            }

            // Always fetch permissions and THEN set loading to false
            await fetchPermissions();
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = (userData: User) => {
        setUser(userData);
        // Store only minimal, non-sensitive data in localStorage
        const publicUserData = {
            _id: userData._id,
            fullName: userData.fullName,
            email: userData.email,
            role: userData.role,
            initials: userData.initials,
            labName: userData.labName,
            designation: userData.designation,
            division: userData.division,
            status: userData.status,
            hasApprovalAuthority: userData.hasApprovalAuthority
        };
        localStorage.setItem('user', JSON.stringify(publicUserData));
        fetchPermissions(); // Refresh permissions on login
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const hasPermission = (feature: string): boolean => {
        if (!user) return false;

        const permission = permissions.find(p => p.feature === feature);
        if (!permission) {
            console.warn(`[AuthContext] Permission check: Feature '${feature}' not found in configuration.`);
            return false;
        }

        const hasAccess = permission.roles.includes(user.role);

        if (feature === FeatureCodes.FEATURE_FORM_MANAGEMENT_OWN_LAB && user.role === 'User') {

        }
        return hasAccess;
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isAuthenticated: !!user,
            isLoading,
            isPermissionsLoading,
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
