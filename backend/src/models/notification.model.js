/**
 * @fileoverview Data Model - Defines database schema and model methods
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const NotificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['NEW_USER_APPROVAL', 'REOPEN_REQUEST', 'REFERENCE_ASSIGNED', 'REMINDER', 'FORM_SHARED', 'FORM_UPDATED', 'PROFILE_UPDATE'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String
    },
    referenceId: {
        type: Schema.Types.ObjectId,
        ref: 'Reference' // This ref name might be ambiguous if we have multiple models, but keeping for backward compat check.
    },
    referenceType: {
        type: String,
        enum: ['LocalReference', 'GlobalReference', 'Form', null],
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export const Notification = mongoose.model('Notification', NotificationSchema);
