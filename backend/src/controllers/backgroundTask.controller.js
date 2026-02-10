/**
 * @fileoverview API Controller - Handles HTTP requests and business logic
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { BackgroundTask } from "../models/backgroundTask.model.js";

/**
 * Get active tasks for the current user.
 */
const getMyTasks = asyncHandler(async (req, res) => {
    // Fetch pending or in-progress tasks, OR recently completed/failed tasks (within last 5 minutes)
    // This allows the UI to show "Done" for a moment before clearing.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const tasks = await BackgroundTask.find({
        user: req.user._id,
        $or: [
            { status: { $in: ["PENDING", "IN_PROGRESS"] } },
            {
                status: { $in: ["COMPLETED", "FAILED"] },
                updatedAt: { $gt: fiveMinutesAgo }
            }
        ]
    }).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, "Tasks fetched successfully", tasks)
    );
});

export {
    getMyTasks
};
