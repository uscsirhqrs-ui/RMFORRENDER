/**
 * @fileoverview Data Model - Defines database schema and model methods
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-20
 */

import mongoose, { Schema } from 'mongoose'

const ArchivedLocalReferenceSchema = new Schema(
    {
        refType: {
            type: String,
            default: 'LocalReference',
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
            default: true,
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
        labName: {
            type: String,
            required: true,
        },
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
        collection: 'localreferences_archive'
    }
)

// Primary performance indexes
ArchivedLocalReferenceSchema.index({ participants: 1, status: 1 });
ArchivedLocalReferenceSchema.index({ markedToDivision: 1, status: 1 });
ArchivedLocalReferenceSchema.index({ markedTo: 1, status: 1 });
ArchivedLocalReferenceSchema.index({ labName: 1, createdAt: -1 });
ArchivedLocalReferenceSchema.index({ labName: 1, status: 1 });
ArchivedLocalReferenceSchema.index({ status: 1, createdAt: -1 });
ArchivedLocalReferenceSchema.index({ isArchived: 1, isHidden: 1 });
ArchivedLocalReferenceSchema.index({ subject: 'text', refId: 'text' });
ArchivedLocalReferenceSchema.index({ refId: 1 });

export const ArchivedLocalReference = mongoose.model('ArchivedLocalReference', ArchivedLocalReferenceSchema)
