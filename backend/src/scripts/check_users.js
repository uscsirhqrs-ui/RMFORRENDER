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

const DB_NAME = "testing_portal_references_management";

async function checkUsers() {
    try {
        console.log("Connecting to MongoDB...");
        const uri = process.env.MONGODB_URI?.replace(/\/$/, "");
        await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log(`Connected to ${DB_NAME}`);

        const userColl = mongoose.connection.collection('users');
        const count = await userColl.countDocuments();

        console.log(`\nTotal users in database: ${count}`);

        if (count > 0) {
            const users = await userColl.find({}).toArray();
            console.log("\nUsers found:");
            users.forEach(user => {
                console.log(`- ${user.email} (${user.labName}) - ${user.designation}`);
            });
        } else {
            console.log("\n⚠️ No users found in the database!");
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Check failed:", err);
        process.exit(1);
    }
}

checkUsers();
