import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DB_NAME = "RMP"; // User's DB name

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        const uri = process.env.MONGODB_URI?.replace(/\/$/, "");
        await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log("Connected successfully.");

        const globalColl = mongoose.connection.collection('globalreferences');
        const localColl = mongoose.connection.collection('localreferences');

        console.log("Updating Global References (setting isInterLab: true if missing or false)...");
        const globalRes = await globalColl.updateMany(
            { $or: [{ isInterLab: { $exists: false } }, { isInterLab: false }] },
            { $set: { isInterLab: true } }
        );
        console.log(`Updated ${globalRes.modifiedCount} Global References.`);

        console.log("Updating Local References (setting isInterLab: false if missing or true)...");
        const localRes = await localColl.updateMany(
            { $or: [{ isInterLab: { $exists: false } }, { isInterLab: true }] },
            { $set: { isInterLab: false } }
        );
        console.log(`Updated ${localRes.modifiedCount} Local References.`);

        // Also ensure participants are correctly populated for Global Refs if missing (as it might affect visibility)
        console.log("Verifying participants for Global References...");
        // This is more complex, but a simple check for empty participants:
        const missingPartCount = await globalColl.countDocuments({ participants: { $size: 0 } });
        console.log(`Warning: Found ${missingPartCount} Global References with NO participants.`);

        await mongoose.disconnect();
        console.log("Disconnected. Done.");
    } catch (err) {
        console.error("Fix failed:", err);
        process.exit(1);
    }
}

run();
