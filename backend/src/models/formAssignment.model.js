/**
 * @fileoverview Data Model - Defines database schema and model methods
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-30
 */

import mongoose, { Schema } from 'mongoose';

const formAssignmentSchema = new Schema(
    {
        templateId: {
            type: Schema.Types.ObjectId,
            ref: 'ActiveForm',
            required: true,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        assignedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        dataId: {
            type: Schema.Types.ObjectId,
            ref: 'CollectedData',
        },
        status: {
            type: String,
            enum: ['Pending', 'Edited', 'Approved', 'Submitted'],
            default: 'Pending',
        },
        parentAssignmentId: {
            type: Schema.Types.ObjectId,
            ref: 'FormAssignment',
            default: null
        },
        delegationChain: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        lastAction: {
            type: String,
            enum: ['Edited', 'Approved', 'Submitted', 'Marked Back', 'Delegated', 'Draft Saved', 'Draft Updated', 'Auto-Approved (Restricted Mode)'],
            required: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        remarks: {
            type: String,
        },
        instructions: {
            type: String, // Initial delegation/assignment instructions (Immutable)
        },
        isFinalized: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
formAssignmentSchema.index({ assignedTo: 1, status: 1 });
formAssignmentSchema.index({ templateId: 1, assignedTo: 1 });

export const FormAssignment = mongoose.model('FormAssignment', formAssignmentSchema);
