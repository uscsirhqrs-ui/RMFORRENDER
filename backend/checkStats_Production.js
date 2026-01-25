import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_NAME = "RMP"; // User's DB name

async function run() {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Connected to DB");

        const collection = mongoose.connection.collection('globalreferences');

        // Let's mimic getDashboardStats logic for a generic user check
        // We can't easily mimic req.user without data, but we can check the total data state.

        const totalRaw = await collection.countDocuments({});
        console.log("Total Raw Global References:", totalRaw);

        const isInterLabTrue = await collection.countDocuments({ isInterLab: true });
        console.log("isInterLab: true count:", isInterLabTrue);

        const isInterLabFalse = await collection.countDocuments({ isInterLab: false });
        console.log("isInterLab: false count:", isInterLabFalse);

        const isInterLabMissing = await collection.countDocuments({ isInterLab: { $exists: false } });
        console.log("isInterLab missing count:", isInterLabMissing);

        const visibilityCheck = await collection.countDocuments({
            isHidden: { $ne: true },
            isArchived: { $ne: true }
        });
        console.log("Visible & Non-Archived count:", visibilityCheck);

        const statusCounts = await collection.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]).toArray();
        console.log("Status Breakdown:", JSON.stringify(statusCounts, null, 2));

        const sample = await collection.findOne({});
        console.log("Sample Document Fields:", Object.keys(sample || {}));
        if (sample) console.log("Sample isInterLab value:", sample.isInterLab);

        await mongoose.disconnect();
    } catch (err) {
        console.error("Diagnostic failed:", err);
    }
}

run();
