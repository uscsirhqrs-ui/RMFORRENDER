/**
 * @fileoverview API Service - Handles HTTP client requests
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import axios from "axios";
import axiosInstance from "./axiosInstance";
import { API_BASE_URL } from "../constants";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  mobileNo?: string;
}

interface UpdateProfilePayload {
  fullName?: string;
  labName?: string;
  designation?: string;
  division?: string;
  mobileNo?: string;
  bio?: string;
  website?: string;
  settings?: {
    theme?: 'light' | 'dark' | 'system';
    accentColor?: 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber';
    fontSize?: 'small' | 'medium' | 'large';
  };
  isSubmitted?: boolean;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Logs in a user.
 * @param payload - Login credentials (email, password)
 * @returns Promise with API response
 */
export const loginUser = async (
  payload: LoginPayload
): Promise<ApiResponse> => {
  try {
    console.log("before call loginUser...");
    const response = await axios.post<ApiResponse>(
      `${API_BASE_URL}/users/login`,
      payload,
      { withCredentials: true }
    );
    console.log("after call loginUser...");

    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    console.log("In error loginUser...");
    console.log("error", error.response?.data?.message);
    return {
      success: false,
      message: error.response?.data?.message || "Login failed",
    };
  }
};

/**
 * Logs out the current user.
 * @returns Promise with API response
 */
export const logoutUser = async (): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post<ApiResponse>(`/users/logout`);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Logout failed",
    };
  }
};

/**
 * Registers a new user.
 * @param payload - Registration details (email, password)
 * @returns Promise with API response
 */
export const registerUser = async (
  payload: RegisterPayload
): Promise<ApiResponse> => {
  try {
    console.log("before call registerUser...");
    const response = await axios.post<ApiResponse>(
      `${API_BASE_URL}/users/register`,
      payload,
      { withCredentials: true }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Registration failed",
    };
  }
};

export const sendPasswordResetLink = async (payload: {
  email: string;
}): Promise<ApiResponse> => {
  try {
    console.log("reached sendpasswordapi at frontend");
    const response = await axios.post<ApiResponse>(
      `${API_BASE_URL}/users/forgot-password`,
      payload,
      { withCredentials: true }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to send reset link",
    };
  }
};

export const verifyResetLink = async (payload: {
  userId: string;
  token: string;
}): Promise<ApiResponse> => {
  try {
    console.log("reached verifyResetLink at frontend");
    const response = await axios.post<ApiResponse>(
      `${API_BASE_URL}/users/verify-reset-token`,
      payload,
      { withCredentials: true }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to verify reset token link",
    };
  }
};

export const activateAccount = async (payload: {
  userId: string;
  token: string;
}): Promise<ApiResponse> => {
  try {
    const response = await axios.post<ApiResponse>(
      `${API_BASE_URL}/users/activate-account`,
      payload,
      { withCredentials: true }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to activate account",
    };
  }
};

export const changePassword = async (payload: {
  oldPassword: string;
  newPassword: string;
}): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post<ApiResponse>(
      `/users/change-password`,
      payload
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to change password",
    };
  }
};

export const resetPassword = async (payload: {
  userId: string | null;
  token: string | null;
  newPassword: string | null;
}): Promise<ApiResponse> => {
  try {
    console.log("reached resetPassword at frontend");
    const response = await axios.post<ApiResponse>(
      `${API_BASE_URL}/users/reset-password`,
      payload,
      { withCredentials: true }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to reset password",
    };
  }
};

/**
 * Updates the current user's profile.
 * @param payload - Profile details (fullName, labName, etc.)
 * @returns Promise with API response
 */
export const updateProfile = async (
  payload: UpdateProfilePayload
): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.patch<ApiResponse>(
      `/users/profile`,
      payload
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to update profile",
    };
  }
};

/**
 * Fetches the current authenticated user's profile.
 * @returns Promise with API response
 */
export const getCurrentUser = async (): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.get<ApiResponse>(`/users/profile`);
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to fetch current user",
    };
  }
};

export const updateAvatar = async (
  formData: FormData
): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.patch<ApiResponse>(
      `/users/avatar`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to update avatar",
    };
  }
};

/**
 * Fetches all users (admins see all, but logic in controller filters).
 * @returns Promise with API response
 */
/**
 * Fetches all users with pagination and search.
 * @returns Promise with API response
 */
export const getAllUsers = async (page: number = 1, limit: number = 20, search: string = ""): Promise<ApiResponse> => {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search
    });
    const response = await axiosInstance.get<ApiResponse>(
      `/users/getAllUsers?${queryParams}`
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to fetch users",
    };
  }
};

/**
 * Updates a user's account status.
 * @param userId - The ID of the user to update
 * @param status - The new status ('Approved', 'Pending', 'Rejected')
 * @returns Promise with API response
 */
export const updateUserStatus = async (
  userId: string,
  status: 'Approved' | 'Pending' | 'Rejected'
): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.patch<ApiResponse>(
      `/users/status/${userId}`,
      { status }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to update user status",
    };
  }
};

/**
 * Creates an administrative user (Admin or Delegated Admin).
 * @param payload - User details including role
 * @returns Promise with API response
 */
export const createAdminUser = async (
  payload: any
): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post<ApiResponse>(
      `/users/admin-creation`,
      payload
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to create administrative user",
    };
  }
};

/**
 * Bulk updates the status of multiple users.
 * @param userIds - Array of user IDs to update
 * @param status - The new status ('Approved', 'Pending', 'Rejected')
 * @returns Promise with API response
 */
export const bulkUpdateUserStatus = async (
  userIds: string[],
  status: 'Approved' | 'Pending' | 'Rejected'
): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.patch<ApiResponse>(
      `/users/status/bulk`,
      { userIds, status }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to bulk update user status",
    };
  }
};

/**
 * Bulk deletes multiple users.
   * @param userIds - Array of user IDs to delete
   * @returns Promise with API response
   */
export const bulkDeleteUsers = async (
  userIds: string[]
): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post<ApiResponse>(
      `/users/delete/bulk`,
      { userIds }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to delete users",
    };
  }
};

/**
 * Fetches a user's profile by their ID.
 * @param userId - The ID of the user to fetch
 * @returns Promise with API response
 */
export const getUserById = async (userId: string): Promise<ApiResponse> => {
  try {
    const response = await axios.get<ApiResponse>(
      `${API_BASE_URL}/users/profile/${userId}`,
      { withCredentials: true }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to fetch user profile",
    };
  }
};

/**
 * Manually activates a user account.
 * @param userId - The ID of the user to activate
 * @returns Promise with API response
 */
export const manualActivateUser = async (userId: string): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post<ApiResponse>(
      `/users/activate-manual/${userId}`
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to manually activate user",
    };
  }
};

/**
 * Bulk manually activates user accounts.
 * @param userIds - Array of user IDs to activate
 * @returns Promise with API response
 */
export const bulkActivateUsers = async (userIds: string[]): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post<ApiResponse>(
      `/users/activate-manual/bulk`,
      { userIds }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to bulk activate users",
    };
  }
};
export const switchUserRole = async (targetRole: string): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post<ApiResponse>(
      `/users/switch-role`,
      { targetRole }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to switch role",
    };
  }
};

export const updateUserRoles = async (userId: string, roles: string[]): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.patch<ApiResponse>(
      `/users/update-roles/${userId}`,
      { roles }
    );
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to update user roles",
    };
  }
};
