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

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DB_NAME = "references_management_portal"; // From constants.js

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        const uri = process.env.MONGODB_URI?.replace(/\/$/, "");
        await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log("Connected successfully.");

        const userColl = mongoose.connection.collection('users');

        console.log("Searching for users with insecure avatar URLs...");
        const users = await userColl.find({ avatar: { $regex: /^http:/ } }).toArray();
        console.log(`Found ${users.length} users with http avatars.`);

        let updatedCount = 0;
        for (const user of users) {
            console.log(`Updating ${user.email}: ${user.avatar}`);
            const secureAvatar = user.avatar.replace(/^http:/, 'https:');
            await userColl.updateOne({ _id: user._id }, { $set: { avatar: secureAvatar } });
            updatedCount++;
        }

        console.log(`Updated ${updatedCount} users to use HTTPS avatars.`);

        await mongoose.disconnect();
        console.log("Disconnected. Done.");
    } catch (err) {
        console.error("Fix failed:", err);
        process.exit(1);
    }
}

run();
