/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/user.api";

const Logout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const performLogout = async () => {
            try {
                // Attempt to call backend logout
                await logoutUser();
            } catch (error) {
                console.error("Logout failed", error);
            } finally {
                // Always clear local state and redirect
                logout();
                navigate("/", { replace: true });
            }
        };

        performLogout();
    }, [logout, navigate]);

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <p className="text-gray-600">Logging out...</p>
        </div>
    );
};

export default Logout;
