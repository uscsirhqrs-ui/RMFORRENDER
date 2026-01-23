/**
 * @fileoverview Script to sync database FEATURE_PERMISSIONS with code defaults.
 * This effectively removes the legacy 'Local Admin' role and ensures consistent permissions.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { FeatureCodes, SUPERADMIN_ROLE_NAME } from "../constants.js";

const DB_NAME = 'references_management_portal';

const DEFAULT_FEATURE_PERMISSIONS = [
    {
        feature: FeatureCodes.FEATURE_VIEW_OWN_OFFICE_SENDER,
        label: "Add/Update/View References(own lab)",
        roles: ["User", "Inter Lab sender", SUPERADMIN_ROLE_NAME],
        description: "Add, update, and view references within own lab"
    },
    {
        feature: FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER,
        label: "Add/Update/View References(inter lab)",
        roles: ["Inter Lab sender", SUPERADMIN_ROLE_NAME, "Delegated Admin"],
        description: "Add, update, and view references across different labs"
    },
    {
        feature: FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE,
        label: "Manage Local References(own lab)",
        roles: ["Delegated Admin", "Inter Lab sender", SUPERADMIN_ROLE_NAME],
        description: "Manage local references within own lab (Admin level)"
    },
    {
        feature: FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES,
        label: "Manage Local References (all labs)",
        roles: [SUPERADMIN_ROLE_NAME],
        description: "Manage local references across all labs (Superadmin level)"
    },
    {
        feature: FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES,
        label: "Manage Global References",
        roles: ["Inter Lab sender", SUPERADMIN_ROLE_NAME, "Delegated Admin"],
        description: "Manage global (inter-lab) references"
    },
    {
        feature: FeatureCodes.FEATURE_FORM_MANAGEMENT,
        label: "Form Management",
        roles: ["User", "Inter Lab sender", SUPERADMIN_ROLE_NAME],
        description: "Create forms, share forms, share templates"
    },
    {
        feature: FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE,
        label: "Manage Users(own lab)",
        roles: [SUPERADMIN_ROLE_NAME, "Delegated Admin"],
        description: "Manage users within own lab"
    },
    {
        feature: FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES,
        label: "Manage Users(all labs)",
        roles: [SUPERADMIN_ROLE_NAME],
        description: "Manage users across all labs"
    },
    {
        feature: FeatureCodes.FEATURE_AUDIT_TRAILS,
        label: "Audit Trails",
        roles: [SUPERADMIN_ROLE_NAME],
        description: "View audit trails"
    },
    {
        feature: FeatureCodes.FEATURE_SYSTEM_CONFIGURATION,
        label: "System Configuration",
        roles: [SUPERADMIN_ROLE_NAME],
        description: "Manage system configurations"
    }
];

const syncPermissions = async () => {
    try {
        const uri = process.env.MONGODB_URI?.replace(/\/$/, "");
        if (!uri) {
            console.error("MONGODB_URI not found in environment variables");
            process.exit(1);
        }

        console.log(`Connecting to ${uri}/${DB_NAME}...`);
        await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log("Connected to MongoDB");

        const db = mongoose.connection.db;
        const configCollection = db.collection('systemconfigs');

        console.log("Syncing FEATURE_PERMISSIONS configuration...");

        // Strategy: Overwrite with defaults but preserve roles that are VALID (exist in our enum)
        // For this specific cleanup, we want to purge 'Local Admin' specifically.

        const existingConfig = await configCollection.findOne({ key: 'FEATURE_PERMISSIONS' });

        const updatedValue = DEFAULT_FEATURE_PERMISSIONS.map(def => {
            // STRICT MODE: We want to enforce the defaults for these core features to fix the permission drift.
            // If we want to preserve custom roles, we would need a more complex logic, but for now, 
            // to solve the "Inter Lab sender sees Manage Users" bug, we must ensure the DB matches the code.
            return def;
        });

        await configCollection.updateOne(
            { key: 'FEATURE_PERMISSIONS' },
            {
                $set: {
                    value: updatedValue,
                    description: "Role-based feature access permissions (Synced and Cleaned)"
                }
            },
            { upsert: true }
        );
        console.log("Successfully synced and cleaned FEATURE_PERMISSIONS.");

        // Clean up any users that might have 'Local Admin' role in DB
        const userCollection = db.collection('users');
        const userUpdateResult = await userCollection.updateMany(
            { availableRoles: 'Local Admin' },
            { $pull: { availableRoles: 'Local Admin' } }
        );
        console.log(`Updated ${userUpdateResult.modifiedCount} users by removing 'Local Admin' from availableRoles.`);

        const userRoleResult = await userCollection.updateMany(
            { role: 'Local Admin' },
            { $set: { role: 'Delegated Admin' } }
        );
        console.log(`Updated ${userRoleResult.modifiedCount} users by renaming 'Local Admin' role to 'Delegated Admin'.`);

        await mongoose.disconnect();
        console.log("Disconnected from MongoDB. Sync complete.");
        process.exit(0);
    } catch (error) {
        console.error("Sync failed:", error);
        process.exit(1);
    }
};

syncPermissions();
