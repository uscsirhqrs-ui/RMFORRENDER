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

const VIPMovementSchema = new Schema(
    {
        reference: {
            type: Schema.Types.ObjectId,
            ref: 'VIPReference',
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
    },
    {
        timestamps: true,
    }
)

export const VIPMovement = mongoose.model('vipRefMovement', VIPMovementSchema)
