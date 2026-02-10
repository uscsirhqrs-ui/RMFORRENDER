/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import "./jobs/retention.job.js"; // Initialize cleanup jobs

console.log("----------------------------------------");
console.log("   SERVER STARTING - DIAGNOSTICS PATCH LOADED");
console.log("----------------------------------------");
import "./jobs/archiving.job.js"; // Initialize automated archiving
// Import routes here
import userRoutes from "./routes/user.routes.js";
import globalReferenceRoutes from "./routes/globalReferences.routes.js";
import localReferenceRoutes from "./routes/localReferences.routes.js";
import vipReferenceRoutes from "./routes/vipReferences.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import parichayRoutes from "./routes/parichay.routes.js";
import parichayMockRoutes from "./routes/parichay.mock.routes.js";
// import settingsRoutes from "./routes/settings.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { slowDown } from "express-slow-down";
import helmet from "helmet";

// Import error handling here
import ApiErrors from "./utils/ApiErrors.js";
import { sanitizeNoSQL } from "./middlewares/nosql-protection.middleware.js";


const app = express();
app.set('trust proxy', 1);

// Move CORS to the top to ensure all responses (including rate limiters and helmet blocks) have CORS headers
console.log("CORS Origin configured:", process.env.CLIENT_URL);
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [];

    // In production, be strict about origins
    if (process.env.NODE_ENV === 'production') {
      if (!origin) {
        return callback(new Error('Not allowed by CORS'));
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("CORS Blocked (Production):", origin);
      return callback(new Error('Not allowed by CORS'));
    }

    // Development mode - more permissive but still controlled
    if (process.env.DEV_MODE === 'true' || process.env.NODE_ENV !== 'production') {
      // console.log("CORS Allowed (Dev Mode):", origin);
      return callback(null, true);
    }

    // Allow requests with no origin
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Allow localhost and private IPs
    if (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.startsWith("http://10.")) {
      return callback(null, true);
    }

    // If we are here, origin is not allowed
    console.log("CORS Blocked:", origin, "Allowed:", allowedOrigins);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  maxAge: 86400
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "res.cloudinary.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", "http://localhost:8000", "http://localhost:3000", "http://10.43.13.241:8000", "http://10.43.13.241:3000"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased for development
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts, please try again later.',
});

// Apply global rate limiter
app.use('/api/', globalLimiter);

app.use(express.json({ limit: '1mb' })); // To parse JSON bodies 
app.use(cookieParser()); // To parse cookies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies

// NoSQL injection protection - custom middleware
app.use(sanitizeNoSQL);





// Reference routes declared here
app.use("/api/v1/references/global", globalReferenceRoutes);
app.use("/api/v1/references/local", localReferenceRoutes);
app.use("/api/v1/references/vip", vipReferenceRoutes);

// User routes declared here - with strict rate limiting for auth endpoints
app.use("/api/v1/users/login", authLimiter);
app.use("/api/v1/users/forgot-password", authLimiter);
app.use("/api/v1/users/reset-password", authLimiter);
app.use("/api/v1/users", userRoutes);

// Parichay OAuth routes declared here. Mount mock routes when PARICHAY_MOCK=true
if (process.env.PARICHAY_MOCK === 'true') {
  console.log('PARICHAY_MOCK is true — mounting mock Parichay routes');
  app.use("/api/v1/parichay", parichayMockRoutes);
} else {
  app.use("/api/v1/parichay", parichayRoutes);
}

// Audit routes declared here
app.use("/api/v1/audit", auditRoutes);

// AI routes declared here
app.use("/api/v1/ai", aiRoutes);

// Settings routes declared here
import settingsRoutes from "./routes/settings.routes.js";
app.use("/api/v1/settings", settingsRoutes);

// System Config routes declared here
import systemConfigRoutes from "./routes/systemConfig.routes.js";
app.use("/api/v1/system-config", systemConfigRoutes);

// Notification routes declared here
import notificationRoutes from "./routes/notification.routes.js";
app.use("/api/v1/notifications", notificationRoutes);

// Archive routes declared here
import archiveRoutes from "./routes/archive.routes.js";
app.use("/api/v1/archive", archiveRoutes);

// Form and Data Collection routes
import formRoutes from "./routes/form.routes.js";
app.use("/api/v1/forms", formRoutes);

// Background Task routes
import backgroundTaskRoutes from "./routes/backgroundTask.routes.js";
app.use("/api/v1/tasks", backgroundTaskRoutes);

// Blueprint routes
import formTemplateRoutes from "./routes/formTemplate.routes.js";
app.use("/api/v1/blueprints", formTemplateRoutes);

// Database info endpoint (no auth required for development visibility)
import { getDatabaseInfo } from "./controllers/dbInfo.controller.js";
app.get("/api/v1/db-info", getDatabaseInfo);

// http://localhost:8000/api/v1/users/register


// Serve React Frontend for any unknown routes (SPA)
// MUST come after API routes but before Error Handling
// Define __dirname for ES modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the "public" directory (one level up from src if public is in backend root)
// Assuming directory structure: backend/src/app.js  =>  backend/public
const publicDir = path.join(__dirname, "../public");
const tempDir = path.join(__dirname, "../public/temp");

if (!fs.existsSync(publicDir)) {
  try {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log("Created public directory");
  } catch (err) {
    console.error("Failed to create public directory:", err);
  }
}

if (!fs.existsSync(tempDir)) {
  try {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log("Created public/temp directory for uploads");
  } catch (err) {
    console.error("Failed to create public/temp directory:", err);
  }
}

app.use(express.static(publicDir));


// Serve React Frontend for any unknown routes (SPA)
// MUST come after API routes but before Error Handling
app.get(/.*/, (req, res) => {
  const indexPath = path.join(__dirname, "../public", "index.html");
  console.log(`[SPA-ROUTE] Hit: ${req.originalUrl}`);
  console.log(`[SPA-ROUTE] Serving: ${indexPath}`);

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error(`[SPA-ROUTE] ERROR: index.html not found at ${indexPath}`);

    // Diagnostic info for 404
    let publicDirListing = "Failed to read";
    try {
      publicDirListing = JSON.stringify(fs.readdirSync(path.join(__dirname, "../public")));
    } catch (e) {
      publicDirListing = e.message;
    }

    let rootDirListing = "Failed to read";
    try {
      rootDirListing = JSON.stringify(fs.readdirSync(path.join(__dirname, "../")));
    } catch (e) {
      rootDirListing = e.message;
    }

    res.status(404).send(`
      <h1>404 - SPA Entry Point Not Found</h1>
      <p>Could not find <code>index.html</code> at: <code>${indexPath}</code></p>
      <hr>
      <h3>Diagnostics:</h3>
      <ul>
        <li><strong>__dirname:</strong> ${__dirname}</li>
        <li><strong>process.cwd():</strong> ${process.cwd()}</li>
        <li><strong>Public Dir Contents:</strong> ${publicDirListing}</li>
        <li><strong>Root Dir Contents:</strong> ${rootDirListing}</li>
      </ul>
    `);
  }
});


// Global error handling middleware

app.use((err, req, res, next) => {
  if (err instanceof ApiErrors) {
    res.status(err.statusCode || 500).json({
      success: err.success,
      message: err.message,
      errors: err.errors,
    });
  } else {
    // Log the error for debugging
    console.error("Unhandled Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error"
    });
  }
});

export { app };
