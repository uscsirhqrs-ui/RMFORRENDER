/**
 * @fileoverview API Controller - Handles HTTP requests and business logic
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-30
 */

import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

/**
 * Get current database name
 */
export const getDatabaseInfo = asyncHandler(async (req, res) => {
    const dbName = mongoose.connection.name;
    const nodeEnv = process.env.NODE_ENV || 'development';

    return res.status(200).json(
        new ApiResponse(200, "Database info fetched successfully", {
            dbName,
            nodeEnv
        })
    );
});
