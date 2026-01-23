/**
 * @fileoverview Data Model - Defines database schema and model methods
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import mongoose, { Schema } from 'mongoose';

const collectedDataSchema = new Schema(
  {
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'FormTemplate',
      required: true,
    },
    labName: {
      type: String,
      required: true,
      trim: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    data: {
      type: Map,
      of: Schema.Types.Mixed,
      required: true,
    },
    ipAddress: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const CollectedData = mongoose.model('CollectedData', collectedDataSchema);
