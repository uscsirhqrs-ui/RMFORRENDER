/**
 * @fileoverview Data Model - Defines database schema and model methods
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import mongoose, { Schema } from 'mongoose'

const GlobalReferenceSchema = new Schema(
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
      unique: true,
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
    // Denormalized fields for extreme performance
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
  },
  {
    timestamps: true,
    collection: 'globalreferences'
  }
)

// Primary performance indexes
GlobalReferenceSchema.index({ participants: 1, status: 1 }); // For "My References" filtering
GlobalReferenceSchema.index({ markedToDivision: 1, status: 1 }); // For "Pending in Division" card
GlobalReferenceSchema.index({ markedTo: 1, status: 1 }); // For "Marked To Me" specific counts
GlobalReferenceSchema.index({ participants: 1, createdAt: -1 }); // For default list sorting for a user
GlobalReferenceSchema.index({ status: 1, createdAt: -1 }); // For "All Open" lists
GlobalReferenceSchema.index({ priority: 1, status: 1 }); // For "High Priority" cards
GlobalReferenceSchema.index({ isArchived: 1, isHidden: 1 });
GlobalReferenceSchema.index({ subject: 'text', refId: 'text' }); // Text search optimization

export const GlobalReference = mongoose.model('GlobalReference', GlobalReferenceSchema, 'globalreferences')

