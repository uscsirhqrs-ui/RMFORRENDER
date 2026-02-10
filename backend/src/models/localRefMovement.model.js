/**
 * @fileoverview Data Model - Defines database schema and model methods
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-19
 */

import mongoose, { Schema } from 'mongoose'

const LocalMovementSchema = new Schema(
    {
        reference: {
            type: Schema.Types.ObjectId,
            ref: 'LocalReference',
            required: true,
        },
        markedTo: {
            type: [Schema.Types.ObjectId],
            ref: 'User',
            required: true,
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        statusOnMovement: {
            type: String,
            enum: ['Open', 'In Progress', 'Closed', 'Reopened'],
            required: true,
        },
        remarks: {
            type: String,
        },
        movementDate: {
            type: Date,
            default: Date.now,
        },
        performedByDetails: {
            fullName: String,
            email: String,
            labName: String,
            designation: String,
            division: String
        },
        markedToDetails: [{
            _id: Schema.Types.ObjectId,
            fullName: String,
            email: String,
            labName: String,
            designation: String,
            division: String
        }]
    },
    {
        timestamps: true,
    }
)

// Index for getting movements history of a reference quickly
LocalMovementSchema.index({ reference: 1, movementDate: 1 });
// Index for checking permission (exists query)
LocalMovementSchema.index({ reference: 1, markedTo: 1 });
LocalMovementSchema.index({ reference: 1, performedBy: 1 });

export const LocalMovement = mongoose.model('localRefMovement', LocalMovementSchema)
