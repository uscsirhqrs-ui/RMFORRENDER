import axios from "axios";
import axiosInstance from "./axiosInstance";
import { API_BASE_URL } from "../constants";

export const loginUser = async (payload) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/users/login`,
            payload,
            { withCredentials: true }
        );

        return {
            success: response.data.success,
            message: response.data.message,
            data: response.data.data,
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Login failed",
        };
    }
};

export const logoutUser = async () => {
    try {
        const response = await axiosInstance.post(`/users/logout`);
        return response.data;
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Logout failed",
        };
    }
};

export const registerUser = async (payload) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/users/register`,
            payload,
            { withCredentials: true }
        );
        return {
            success: response.data.success,
            message: response.data.message,
            data: response.data.data,
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Registration failed",
        };
    }
};

export const getCurrentUser = async () => {
    try {
        const response = await axiosInstance.get(`/users/profile`);
        return {
            success: response.data.success,
            message: response.data.message,
            data: response.data.data,
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch current user",
        };
    }
};

// ... add other methods as needed
