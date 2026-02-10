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
import { LocalReference } from './src/models/localReference.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const checkDataCorrectly = async () => {
    try {
        const DB_NAME = 'references_management_portal';
        const uri = process.env.MONGODB_URI?.replace(/\/$/, "");
        const connectionStr = `${uri}/${DB_NAME}`;

        console.log(`Connecting to: ${connectionStr.replace(/\/\/.*@/, '//***@')}`); // log masked URI

        await mongoose.connect(connectionStr);
        console.log('Connected to references_management_portal');

        const count = await LocalReference.countDocuments({});
        console.log(`Total Local References: ${count}`);

        const byLab = await LocalReference.aggregate([
            { $group: { _id: "$labName", count: { $sum: 1 } } }
        ]);
        console.log('References by Lab:', byLab);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

checkDataCorrectly();
