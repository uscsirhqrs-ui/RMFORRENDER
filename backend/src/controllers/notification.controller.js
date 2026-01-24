/**
 * @fileoverview API Controller - Handles HTTP requests and business logic
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiErrors from '../utils/ApiErrors.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Notification } from '../models/notification.model.js';

// Internal Helper to create notification
export const createNotification = async (recipientId, type, title, message, referenceId = null, referenceType = null) => {
    try {
        await Notification.create({
            recipient: recipientId,
            type,
            title,
            message,
            referenceId,
            referenceType
        });
    } catch (error) {
        console.error(`Failed to create notification for user ${recipientId}:`, error);
        // We don't throw here to avoid failing the main transaction (e.g., user reigstration)
        // just because a notification failed.
    }
};

export const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10, unreadOnly = 'true' } = req.query;

    const query = { recipient: userId };
    if (unreadOnly === 'true') {
        query.isRead = false;
    }

    const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const totalUnread = await Notification.countDocuments({ recipient: userId, isRead: false });

    return res.status(200).json(
        new ApiResponse(200, "Notifications fetched successfully", {
            notifications,
            totalUnread
        })
    );
});

export const markAsRead = asyncHandler(async (req, res) => {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        throw new ApiErrors(404, "Notification not found or unauthorized");
    }

    return res.status(200).json(
        new ApiResponse(200, "Notification marked as read", notification)
    );
});

export const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
    );

    return res.status(200).json(
        new ApiResponse(200, "All notifications marked as read")
    );
});
