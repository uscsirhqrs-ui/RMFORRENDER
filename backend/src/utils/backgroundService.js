import { BackgroundTask } from "../models/backgroundTask.model.js";
import { User } from "../models/user.model.js";
import { createNotification } from "../controllers/notification.controller.js";
import { sendEmail, getFormSharedEmailTemplate } from "./mail.js";

/**
 * Updates task progress in the database.
 */
const updateTaskProgress = async (taskId, processed, total) => {
    const progress = total === 0 ? 100 : Math.round((processed / total) * 100);
    await BackgroundTask.findByIdAndUpdate(taskId, {
        progress,
        processedItems: processed,
        totalItems: total,
        status: processed === total ? "COMPLETED" : "IN_PROGRESS"
    });
};

/**
 * Processes a form distribution task.
 * This runs asynchronously and updates the task status.
 */
export const processFormDistribution = async (taskId, template, initiator, actionType = "SHARED", previousTemplate = null) => {
    try {
        const task = await BackgroundTask.findById(taskId);
        if (!task) return;

        task.status = "IN_PROGRESS";
        await task.save();

        // 1. Identify Target Users (Current State)
        let targetUserIds = new Set(template.sharedWithUsers || []);

        if (template.sharedWithLabs && template.sharedWithLabs.length > 0) {
            const labUsers = await User.find({ labName: { $in: template.sharedWithLabs } }).select("_id");
            labUsers.forEach(u => targetUserIds.add(u._id.toString()));
        }

        // 2. Identify Previous Users (if diffing)
        if (previousTemplate) {
            let previousUserIds = new Set(previousTemplate.sharedWithUsers ? previousTemplate.sharedWithUsers.map(id => id.toString()) : []);

            if (previousTemplate.sharedWithLabs && previousTemplate.sharedWithLabs.length > 0) {
                const prevLabUsers = await User.find({ labName: { $in: previousTemplate.sharedWithLabs } }).select("_id");
                prevLabUsers.forEach(u => previousUserIds.add(u._id.toString()));
            }

            // Remove already notified users from target
            for (const prevId of previousUserIds) {
                targetUserIds.delete(prevId);
            }

            // If we are strictly adding users, treat it as a SHARE action for the new users
            if (targetUserIds.size > 0 && actionType === "UPDATED") {
                actionType = "SHARED";
            }
        }

        const totalUsers = targetUserIds.size;

        // If no users to notify, mark complete immediately
        if (totalUsers === 0) {
            await updateTaskProgress(taskId, 0, 0);
            return;
        }

        await updateTaskProgress(taskId, 0, totalUsers);

        const users = await User.find({ _id: { $in: Array.from(targetUserIds) } });

        // Prepare context data
        const name = initiator.fullName || initiator.email;
        const designation = initiator.designation ? `, ${initiator.designation}` : "";
        const lab = initiator.labName ? ` (${initiator.labName})` : "";
        const sharedByName = `${name}${designation}${lab}`;

        let processedCount = 0;
        const usersArray = Array.from(users);

        // Process in chunks to avoid overwhelming resources (e.g., 10 at a time)
        const chunkSize = 10;
        for (let i = 0; i < usersArray.length; i += chunkSize) {
            const chunk = usersArray.slice(i, i + chunkSize);

            await Promise.all(chunk.map(async (user) => {
                try {
                    const title = actionType === "UPDATED"
                        ? "Form Updated"
                        : "New Form Shared";

                    const message = actionType === "UPDATED"
                        ? `The form "${template.title}" has been updated by ${sharedByName}.`
                        : `A new form "${template.title}" has been shared with you by ${sharedByName}.`;

                    const emailSubject = `${title}: ${template.title}`;

                    // Notification
                    await createNotification(
                        user._id,
                        actionType === "UPDATED" ? "FORM_UPDATED" : "FORM_SHARED",
                        title,
                        message,
                        template._id
                    );

                    // Email
                    if (user.email) {
                        await sendEmail({
                            to: user.email,
                            subject: emailSubject,
                            html: getFormSharedEmailTemplate(template, sharedByName)
                        });
                    }
                } catch (err) {
                    console.error(`Failed to notify details for user ${user._id}`, err);
                }
            }));

            processedCount += chunk.length;
            await updateTaskProgress(taskId, Math.min(processedCount, totalUsers), totalUsers);
        }

        // Final ensure complete
        await BackgroundTask.findByIdAndUpdate(taskId, {
            status: "COMPLETED",
            progress: 100,
            processedItems: totalUsers
        });

    } catch (error) {
        console.error("Background Task Failed:", error);
        await BackgroundTask.findByIdAndUpdate(taskId, {
            status: "FAILED",
            error: error.message
        });
    }
};
