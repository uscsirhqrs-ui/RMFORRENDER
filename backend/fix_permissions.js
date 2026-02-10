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
import { SystemConfig } from './src/models/systemConfig.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const DB_NAME = 'references_management_portal';
const FEATURE_PERMISSIONS_KEY = "FEATURE_PERMISSIONS";

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI?.replace(/\/$/, "");
        if (!uri) throw new Error("MONGODB_URI missing");

        await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log(`Connected to MongoDB: ${DB_NAME}`);
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

const fixPermissions = async () => {
    await connectDB();

    try {
        const config = await SystemConfig.findOne({ key: FEATURE_PERMISSIONS_KEY });

        if (!config) {
            console.log("No Feature Permissions found in DB. Nothing to fix.");
            process.exit(0);
        }

        let updated = false;

        // Find "Manage Local References(own lab)" and ensure "Delegated Admin" is in roles
        const targetPerm = "Manage Local References(own lab)";
        const permIndex = config.value.findIndex(p => p.feature === targetPerm);

        if (permIndex !== -1) {
            if (!config.value[permIndex].roles.includes("Delegated Admin")) {
                console.log(`Adding "Delegated Admin" to "${targetPerm}"`);
                config.value[permIndex].roles.push("Delegated Admin");
                updated = true;
            } else {
                console.log(`"Delegated Admin" already exists in "${targetPerm}"`);
            }
        } else {
            console.log(`Warning: "${targetPerm}" feature not found in config.`);
        }

        if (updated) {
            config.markModified('value');
            await config.save();
            console.log("Permissions updated successfully.");
        } else {
            console.log("No changes needed.");
        }

        process.exit(0);

    } catch (error) {
        console.error("Error fixing permissions:", error);
        process.exit(1);
    }
};

fixPermissions();
