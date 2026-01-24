/**
 * @fileoverview API Service - Handles HTTP client requests
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import axiosInstance from './axiosInstance';


export interface Notification {
    _id: string;
    recipient: string;
    type: 'NEW_USER_APPROVAL' | 'REOPEN_REQUEST' | 'REFERENCE_ASSIGNED' | 'REMINDER' | 'FORM_SHARED' | 'FORM_UPDATED' | 'PROFILE_UPDATE';
    title: string;
    message: string;
    referenceId?: string;
    referenceType?: 'LocalReference' | 'GlobalReference' | 'Form';
    isRead: boolean;
    createdAt: string;
}

export interface ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: boolean;
}

interface NotificationsResponse {
    notifications: Notification[];
    totalUnread: number;
}

export const getNotifications = async (page = 1, limit = 10, unreadOnly = true) => {
    return await axiosInstance.get<ApiResponse<NotificationsResponse>>('/notifications', {
        params: { page, limit, unreadOnly }
    });
};

export const markAsRead = async (notificationId: string) => {
    return await axiosInstance.patch(`/notifications/${notificationId}/read`);
};

export const markAllAsRead = async () => {
    return await axiosInstance.patch('/notifications/read-all');
};
