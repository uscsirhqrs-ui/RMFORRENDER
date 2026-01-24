/**
 * @fileoverview Data Model - Defines database schema for Local References
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-14
 */

import mongoose, { Schema } from 'mongoose'

const LocalReferenceSchema = new Schema(
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
            unique: true,
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
            default: false,
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
        // Denormalized fields for performance
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
            designation: String,
        },
        markedToDetails: [{
            fullName: String,
            email: String,
            labName: String,
            designation: String,
        }],
        labName: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true,
        collection: 'localreferences'
    }
)

// Primary performance indexes
LocalReferenceSchema.index({ participants: 1, status: 1 });
LocalReferenceSchema.index({ markedToDivision: 1, status: 1 });
LocalReferenceSchema.index({ markedTo: 1, status: 1 });
LocalReferenceSchema.index({ labName: 1, createdAt: -1 }); // For fast local default sorts
LocalReferenceSchema.index({ labName: 1, status: 1 }); // For lab-wide status filtering
LocalReferenceSchema.index({ participants: 1, createdAt: -1 });
LocalReferenceSchema.index({ status: 1, createdAt: -1 });
LocalReferenceSchema.index({ priority: 1, status: 1 });
LocalReferenceSchema.index({ isArchived: 1, isHidden: 1 });
LocalReferenceSchema.index({ subject: 'text', refId: 'text' });

export const LocalReference = mongoose.model('LocalReference', LocalReferenceSchema)
