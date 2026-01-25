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
import mongoose from "mongoose";
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
import { slowDown } from "express-slow-down";
import helmet from "helmet";

// Import error handling here
import ApiErrors from "./utils/ApiErrors.js";


const app = express();
app.set('trust proxy', 1);

app.use(helmet());

const limiter = slowDown({
  windowMs: 15 * 60 * 1000, // 5 minutes
  delayAfter: 1000, // allow 10 requests per `windowMs` (5 minutes) without slowing them down
  delayMs: (hits) => hits * 200, // add 200 ms of delay to every request after the 10th
  maxDelayMs: 5000, // max global delay of 5 seconds
});

app.use(limiter);


console.log("CORS Origin configured:", process.env.CLIENT_URL);
app.use(cors({
  origin: function (origin, callback) {
    // Development Mode Override
    if (process.env.DEV_MODE === 'true') {
      console.log("CORS Allowed (DEV_MODE):", origin);
      return callback(null, true);
    }

    const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin checks predefined list
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // Check if origin is a local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localNetworkRegex = /^http:\/\/(192\.168|10\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1]))\.\d{1,3}\.\d{1,3}(:\d+)?$/;
    if (localNetworkRegex.test(origin)) {
      console.log("CORS Allowed (Local Network):", origin);
      return callback(null, true);
    }

    // Attempt to allow localhost explicitly if not in CLIENT_URL
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      console.log("CORS Allowed (Localhost):", origin);
      return callback(null, true);
    }

    // If we are here, origin is not allowed
    console.log("CORS Blocked:", origin, "Allowed:", allowedOrigins);
    callback(null, false);
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' })); // To parse JSON bodies 
app.use(cookieParser()); // To parse cookies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies





// Reference routes declared here
app.use("/api/v1/references/global", globalReferenceRoutes);
app.use("/api/v1/references/local", localReferenceRoutes);
app.use("/api/v1/references/vip", vipReferenceRoutes);

// User routes declared here
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
import blueprintRoutes from "./routes/blueprint.routes.js";
app.use("/api/v1/blueprints", blueprintRoutes);

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

// DEBUG ROUTE: Check file system and code content for verification on Render
app.get('/api/v1/debug/verify', (req, res) => {
  const controllerPath = path.join(__dirname, "./controllers/globalReferences.controller.js");
  let codeSnippet = "Not found";
  try {
    const content = fs.readFileSync(controllerPath, 'utf8');
    // Look for my specific helper function to confirm it exists
    const hasHelper = content.includes("const buildReferenceCriteria =");
    codeSnippet = content.slice(0, 500) + `\n\n... Has buildReferenceCriteria: ${hasHelper}`;
  } catch (e) { codeSnippet = `Error: ${e.message}`; }

  res.json({
    deploy_time: "2026-01-25 22:35",
    has_build_helper: codeSnippet.includes("true"),
    controller_snippet: codeSnippet,
    env: process.env.NODE_ENV,
    cwd: process.cwd()
  });
});

// TEMPORARY: Data fix endpoint for users without shell access on Render
app.get('/api/v1/debug/fix-data', async (req, res) => {
  try {
    const globalColl = mongoose.connection.collection('globalreferences');
    const localColl = mongoose.connection.collection('localreferences');

    const globalRes = await globalColl.updateMany(
      { $or: [{ isInterLab: { $exists: false } }, { isInterLab: false }] },
      { $set: { isInterLab: true } }
    );

    const localRes = await localColl.updateMany(
      { $or: [{ isInterLab: { $exists: false } }, { isInterLab: true }] },
      { $set: { isInterLab: false } }
    );

    res.json({
      success: true,
      message: "Data reconciliation complete",
      global_updated: globalRes.modifiedCount,
      local_updated: localRes.modifiedCount,
      note: "All Global references set to isInterLab: true, all Local references set to isInterLab: false."
    });
  } catch (err) {
    console.error("Data fix failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


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
