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

const activeFormSchema = new Schema(
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
          enum: ['text', 'select', 'date', 'checkbox', 'radio', 'file', 'header'],
          default: 'text',
        },
        label: String,
        placeholder: String,
        section: String, // Group name (e.g., "Personal Details")
        columnSpan: {
          type: Number,
          default: 1, // 1 or 2
        },
        description: String, // Helper text
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
    sharedWithLabs: {
      type: [String],
      default: [],
    },
    sharedWithUsers: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
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
    allowDelegation: {
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

export const ActiveForm = mongoose.model('ActiveForm', activeFormSchema);
