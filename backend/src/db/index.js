/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import mongoose from "mongoose";


const connectDB = async () => {
    try {
        // Auto-detect database based on environment
        let DB_NAME;

        if (process.env.DB_NAME) {
            // Use explicit DB_NAME if provided in .env
            DB_NAME = process.env.DB_NAME;
        } else if (process.env.NODE_ENV === 'production') {
            // Production environment - use production database
            DB_NAME = 'references_management_portal';
        } else {
            // Development/localhost environment - use testing database
            DB_NAME = 'testing_portal_references_management';
        }

        const uri = process.env.MONGODB_URI?.replace(/\/$/, ""); // Remove trailing slash if present
        const connectionInstance = await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
        console.log({ DB_NAME, NODE_ENV: process.env.NODE_ENV || 'development' });

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1); // Exit process with failure
    }
}

import { initializeDefaultConfigs } from "../controllers/systemConfig.controller.js";

const originalConnectDB = connectDB;
const connectDBWithInit = async () => {
    await originalConnectDB();
    await initializeDefaultConfigs();
};

export default connectDBWithInit;