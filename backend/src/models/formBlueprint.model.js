/**
 * @fileoverview Data Model - Defines database schema and model methods
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-22
 */

import mongoose, { Schema } from 'mongoose';

const formBlueprintSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        description: {
            type: String,
            trim: true
        },
        category: {
            type: String,
            default: "General",
            index: true
        },
        fields: [
            {
                id: String,
                type: {
                    type: String,
                    enum: ['text', 'select', 'date', 'radio', 'checkbox'],
                    required: true
                },
                label: String,
                placeholder: String,
                required: Boolean,
                options: [{ label: String, value: String }],
                validation: {
                    isNumeric: Boolean,
                    isEmail: Boolean,
                    pattern: String,
                    minLength: Number,
                    maxLength: Number
                }
            }
        ],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        isPublic: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export const FormBlueprint = mongoose.model('FormBlueprint', formBlueprintSchema);
