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
        console.log(`URI: ${uri}/${DB_NAME}`);
        await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log("Connected successfully.");

        const userColl = mongoose.connection.collection('users');

        const totalUsers = await userColl.countDocuments({});
        console.log(`Total users: ${totalUsers}`);

        const sampleUsers = await userColl.find({}, { projection: { fullName: 1, email: 1, avatar: 1 } }).limit(5).toArray();
        console.log("Sample User Avatars:");
        sampleUsers.forEach(u => {
            console.log(`- ${u.email}: [${u.avatar}]`);
        });

        const httpCount = await userColl.countDocuments({ avatar: { $regex: /^http:/ } });
        console.log(`HTTP avatars: ${httpCount}`);

        const httpsCount = await userColl.countDocuments({ avatar: { $regex: /^https:/ } });
        console.log(`HTTPS avatars: ${httpsCount}`);

        const emptyCount = await userColl.countDocuments({ $or: [{ avatar: "" }, { avatar: { $exists: false } }, { avatar: null }] });
        console.log(`Empty/Null avatars: ${emptyCount}`);

        await mongoose.disconnect();
        console.log("Disconnected. Done.");
    } catch (err) {
        console.error("Diagnosis failed:", err);
        process.exit(1);
    }
}

run();
