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

const formTemplateSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fields: [
      {
        id: String,
        type: {
          type: String,
          enum: ['text', 'select', 'date'],
          default: 'text',
        },
        label: String,
        placeholder: String,
        required: {
          type: Boolean,
          default: false,
        },
        options: [
          {
            label: String,
            value: String,
          },
        ],
        validation: {
          pattern: String,
          message: String,
          isNumeric: Boolean,
          isEmail: Boolean,
        },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedWithLabs: [
      {
        type: String, // labName
      },
    ],
    sharedWithUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    allowMultipleSubmissions: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deadline: {
      type: Date,
    },
    archivedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const FormTemplate = mongoose.model('FormTemplate', formTemplateSchema);
