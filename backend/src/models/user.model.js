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
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { SUPERADMIN_ROLE_NAME } from "../constants.js";

const userSchema = new Schema(
  {
    labName: {
      type: String,
      // required: true,
      // unique: true,
      lowercase: false,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    division: {
      type: String,
      trim: true,
    },
    mobileNo: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['User', 'Inter Lab sender', 'Delegated Admin', SUPERADMIN_ROLE_NAME],
      default: 'User',
    },
    availableRoles: {
      type: [String],
      enum: ['User', 'Inter Lab sender', 'Delegated Admin', SUPERADMIN_ROLE_NAME],
      default: ['User'],
    },
    fullName: {
      type: String,
      // required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url
      // required: true,
    },
    coverImage: {
      type: String, // cloudinary url
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    refreshToken: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    status: {
      type: String,
      enum: ['Approved', 'Pending', 'Rejected'],
      default: 'Pending',
      required: true,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    isActivated: {
      type: Boolean,
      default: false,
    },
    activationToken: {
      type: String,
    },
    settings: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
      accentColor: { type: String, enum: ['indigo', 'blue', 'emerald', 'rose', 'amber'], default: 'indigo' },
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    },
    // Parichay OAuth fields
    parichayId: {
      type: String,
      sparse: true,
      index: true,
    },
    parichayAccessToken: {
      type: String,
    },
    parichayRefreshToken: {
      type: String,
    },
    parichayTokenExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.virtual('initials').get(function () {
  if (!this.fullName) return 'U';
  const names = this.fullName.split(' ');
  const initials = names.map(n => n[0]).join('').toUpperCase();
  return initials.slice(0, 2);
});

userSchema.pre('save', async function (next) {
  const user = this;

  // Normalize Lab Name: Force uppercase and CSIR- prefix
  if (user.isModified('labName') && user.labName) {
    let normalized = user.labName.trim().toUpperCase();
    if (!normalized.startsWith('CSIR-')) {
      normalized = `CSIR-${normalized}`;
    }
    user.labName = normalized;
  }

  // Singleton Superadmin Check: Ensure only one user can have 'Superadmin' capability
  if ((user.isModified('role') && user.role === SUPERADMIN_ROLE_NAME) ||
    (user.isModified('availableRoles') && user.availableRoles && user.availableRoles.includes(SUPERADMIN_ROLE_NAME))) {

    // Check if any OTHER user has Superadmin in their availableRoles
    const existingSuperadmin = await this.constructor.findOne({
      availableRoles: SUPERADMIN_ROLE_NAME,
      _id: { $ne: user._id }
    });

    if (existingSuperadmin) {
      const err = new Error("Forbidden: A System Administrator already exists. Only one Superadmin is allowed in the system.");
      err.statusCode = 403; // Optional: logical, even if not used by Mongoose directly
      return next(err);
    }
  }

  if (user.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    user.password = hashedPassword;
  }
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  const user = this;
  return await bcrypt.compare(password, user.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      fullName: this.fullName,
      status: this.status,
      isSubmitted: this.isSubmitted,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateResetPasswordToken = function () {
  console.log("reached in generateResetPasswordToken ");
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.RESET_PASS_TOKEN_SECRET,
    {
      expiresIn: process.env.RESET_PASS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateActivationToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.ACTIVATION_TOKEN_SECRET || process.env.RESET_PASS_TOKEN_SECRET,
    {
      expiresIn: '24h',
    }
  );
};


export const User = mongoose.model('User', userSchema);
