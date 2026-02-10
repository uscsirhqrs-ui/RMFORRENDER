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
dotenv.config();

const DB_NAME = "RMP"; // Based on previous knowledge

async function check() {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Connected to DB");

        const collection = mongoose.connection.collection('globalreferences');

        const total = await collection.countDocuments({});
        console.log("Total global references:", total);

        const interLabTotal = await collection.countDocuments({ isInterLab: true });
        console.log("Total isInterLab: true:", interLabTotal);

        const statusCounts = await collection.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]).toArray();
        console.log("Status counts:", JSON.stringify(statusCounts, null, 2));

        const sample = await collection.findOne({});
        console.log("Sample document:", JSON.stringify(sample, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
