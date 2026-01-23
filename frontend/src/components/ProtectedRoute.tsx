/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children?: React.ReactNode;
    allowedRoles?: string[];
    requiredPermissions?: string[];
}

const ProtectedRoute = ({ children, allowedRoles, requiredPermissions }: ProtectedRouteProps) => {
    const { isAuthenticated, user, isLoading, isPermissionsLoading, hasPermission } = useAuth();
    const location = useLocation();

    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            const userInStorage = localStorage.getItem('user');
            if (event.persisted || !userInStorage) {
                if (!userInStorage) {
                    window.location.reload();
                }
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => {
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, []);

    console.log('[ProtectedRoute] Rendering -', {
        path: location.pathname,
        isAuthenticated,
        isLoading,
        user: user?._id,
        userRole: user?.role,
        allowedRoles,
        requiredPermissions,
        isPending: user?.status === 'Pending',
        isProfileIncomplete: !user?.labName || !user?.designation
    });

    // Wait for auth and permissions to finish loading before making redirect decisions
    if (isLoading || isPermissionsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-500 animate-pulse font-heading tracking-wide">
                        {isLoading ? "Verifying Session..." : "Syncing Permissions..."}
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        console.log('[ProtectedRoute] Redirecting to /login - not authenticated');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role check if allowedRoles is provided
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        console.log('[ProtectedRoute] Redirecting to / - role mismatch');
        return <Navigate to="/" replace />;
    }

    // Permission check if requiredPermissions is provided
    if (requiredPermissions && requiredPermissions.length > 0) {
        // OR logic: User needs at least ONE of the required permissions
        const hasRequiredPermission = requiredPermissions.some(permission => hasPermission(permission));

        if (!hasRequiredPermission) {
            console.log('[ProtectedRoute] Redirecting to / - permission denied');
            return <Navigate to="/" replace />;
        }
    }

    const isPending = user?.status === 'Pending';
    const isProfileIncomplete = !user?.labName || !user?.designation;

    if (isAuthenticated && location.pathname !== '/profile') {
        if (isPending) {
            console.log('[ProtectedRoute] Redirecting to /profile - pending status');
            return <Navigate to="/profile" state={{ message: "Your account is awaiting administrator approval. Please ensure your profile is complete." }} replace />;
        }

        if (isProfileIncomplete) {
            console.log('[ProtectedRoute] Redirecting to /profile - incomplete profile');
            return <Navigate to="/profile" state={{ message: "Please complete your profile details (Lab, Designation, etc.) and obtain administrator approval to access the portal." }} replace />;
        }
    }

    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
