/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { initializeDefaultConfigs } from '../controllers/systemConfig.controller.js';

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI?.replace(/\/$/, "");
        const DB_NAME = 'references_management_portal';
        await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log("Connected to MongoDB");

        await initializeDefaultConfigs();
        console.log("Default configs initialized successfully");

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Failed to initialize configs:", error);
        process.exit(1);
    }
};

run();
