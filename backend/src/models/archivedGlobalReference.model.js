/**
 * @fileoverview Data Model - Defines database schema for Archived Global References
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-20
 */

import mongoose, { Schema } from 'mongoose'

const ArchivedGlobalReferenceSchema = new Schema(
    {
        refType: {
            type: String,
            default: 'GlobalReference',
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        refId: {
            type: String,
            required: true,
        },
        remarks: {
            type: String,
        },
        eofficeNo: {
            type: String,
            trim: true,
        },
        deliveryMode: {
            type: String,
            enum: ['Eoffice', 'Email', 'Physical'],
        },
        deliveryDetails: {
            type: String,
            trim: true,
        },
        sentAt: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['Open', 'In Progress', 'Closed', 'Reopened'],
            default: 'Open',
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High'],
            default: 'Medium',
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        markedTo: {
            type: [Schema.Types.ObjectId],
            ref: 'User',
            required: true,
        },
        isHidden: {
            type: Boolean,
            default: false,
        },
        isArchived: {
            type: Boolean,
            default: true, // Default to true for archived collection
        },
        reopenRequest: {
            requestId: {
                type: String,
            },
            requestedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
            reason: {
                type: String,
            },
            requestedAt: {
                type: Date,
            },
        },
        participants: {
            type: [Schema.Types.ObjectId],
            ref: 'User',
        },
        markedToDivision: {
            type: String,
        },
        createdByDetails: {
            fullName: String,
            email: String,
            labName: String,
        },
        markedToDetails: [{
            fullName: String,
            email: String,
            labName: String,
        }],
        // Meta data for archiving
        archivedAt: {
            type: Date,
            default: Date.now
        },
        originalId: {
            type: Schema.Types.ObjectId
        }
    },
    {
        timestamps: true,
        collection: 'globalreferences_archive'
    }
)

// Primary performance indexes
ArchivedGlobalReferenceSchema.index({ participants: 1, status: 1 });
ArchivedGlobalReferenceSchema.index({ markedToDivision: 1, status: 1 });
ArchivedGlobalReferenceSchema.index({ markedTo: 1, status: 1 });
ArchivedGlobalReferenceSchema.index({ participants: 1, createdAt: -1 });
ArchivedGlobalReferenceSchema.index({ status: 1, createdAt: -1 });
ArchivedGlobalReferenceSchema.index({ isArchived: 1, isHidden: 1 });
ArchivedGlobalReferenceSchema.index({ subject: 'text', refId: 'text' });
ArchivedGlobalReferenceSchema.index({ refId: 1 }); // unique: true removed for archive to prevent collisions during failed retries, but indexed for search

export const ArchivedGlobalReference = mongoose.model('ArchivedGlobalReference', ArchivedGlobalReferenceSchema)
