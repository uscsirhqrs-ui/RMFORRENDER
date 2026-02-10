/**
 * @fileoverview Express Middleware - Request/response processing
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-28
 */

import multer from "multer";
import path from "path";
import crypto from "crypto";
import ApiErrors from "../utils/ApiErrors.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp")
  },
  filename: function (req, file, cb) {
    // Generate cryptographically secure unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();

    // Sanitize extension to prevent path traversal
    const safeExt = ext.replace(/[^a-z0-9.]/gi, '');

    cb(null, `${timestamp}-${uniqueSuffix}${safeExt}`)
  }
})

/**
 * File filter to validate file types
 * Whitelist approach for security
 */
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  // Allowed file extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiErrors(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`, 400), false);
  }
};

import { SystemConfig } from "../models/systemConfig.model.js";

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // High default, will be overridden by dynamic check
    files: 5,
    fields: 10
  },
  fileFilter
})

/**
 * Enhanced Multer Middleware with dynamic SystemConfig limits
 */
export const dynamicUpload = (req, res, next) => {
  // 1. Fetch dynamic limits and status from DB
  SystemConfig.find({ key: { $in: ["MAX_FILE_SIZE_MB", "FILE_UPLOADS_ENABLED"] } })
    .then(configs => {
      const configMap = configs.reduce((acc, c) => {
        acc[c.key] = c.value;
        return acc;
      }, {});

      const uploadsEnabled = configMap["FILE_UPLOADS_ENABLED"] !== false; // Default true
      const limitMB = configMap["MAX_FILE_SIZE_MB"] || 1; // Default 1MB
      const limitBytes = limitMB * 1024 * 1024;

      // 2. Create dynamic multer instance
      const multerInstance = multer({
        storage,
        limits: {
          fileSize: limitBytes,
          files: 5,
          fields: 20 // Increased for complex forms
        },
        fileFilter: (req, file, cb) => {
          // Check if uploads are globally disabled
          if (!uploadsEnabled) {
            return cb(new Error("File uploads are currently disabled by the administrator."));
          }
          // Use the secure fileFilter
          fileFilter(req, file, cb);
        }
      }).any();

      // 3. Execute multer
      multerInstance(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: `File too large. Maximum allowed size is ${limitMB}MB.`
            });
          }
          return res.status(400).json({ success: false, message: `Upload Error: ${err.message}` });
        } else if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        next();
      });
    })
    .catch(err => {
      console.error("Multer Dynamic Config Error:", err);
      // Fallback to static upload if DB fails
      upload.any()(req, res, next);
    });
};
