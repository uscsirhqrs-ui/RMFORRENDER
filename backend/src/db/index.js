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
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI?.replace(/\/$/, ""); // Remove trailing slash if present
        const connectionInstance = await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
        console.log({ DB_NAME })

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