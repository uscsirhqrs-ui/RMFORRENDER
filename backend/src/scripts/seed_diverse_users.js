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
import { User } from '../models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_NAME = 'references_management_portal';
const LABS = [
    "CSIR-HQRS", "CSIR-AMPRI", "CSIR-CBRI", "CSIR-CCMB"
];

const ROLES = ['Delegated Admin', 'User', 'Inter Lab sender'];

const DESIGNATIONS = [
    "Director General-CSIR",
    "Joint Secretary(Admin)",
    "Financial Advisor",
    "Chief Vigilance Officer",
    "Scientist",
    "Sr. Controller Of Administration",
    "Sr. Controller Of Finance And Accounts",
    "Sr. Controller Of Stores And Purchase"
];

const DIVISIONS = [
    "HR-I",
    "HR-II",
    "HR-III",
    "Director Office",
    "Office of DG CSIR",
    "Office of JS(Admin) CSIR",
    "Office of FA CSIR",
];

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

const seedUsers = async () => {
    await connectDB();

    try {
        console.log("Seeding 20 diverse users...");

        const usersToCreate = [];

        let globalCount = 1;
        for (const lab of LABS) {
            console.log(`\nSeeding 5 users for ${lab}...`);

            for (let i = 1; i <= 5; i++) {
                const role = ROLES[Math.floor(Math.random() * ROLES.length)];
                const designation = DESIGNATIONS[Math.floor(Math.random() * DESIGNATIONS.length)];
                const division = DIVISIONS[Math.floor(Math.random() * DIVISIONS.length)];

                // Generate pseudo-random but deterministic names
                const firstName = `DemoUser${globalCount}`;
                const lastName = `(${lab.replace('CSIR-', '')})`;
                const email = `demo.user${globalCount}.${lab.toLowerCase().replace('csir-', '')}@csir.res.in`;

                usersToCreate.push({
                    fullName: `${firstName} ${lastName}`,
                    email: email.toLowerCase(),
                    password: 'password123', // Will be hashed by pre-save hook
                    labName: lab,
                    division: division,
                    designation: designation,
                    role: role,
                    mobileNo: `987654${globalCount.toString().padStart(4, '0')}`,
                    isActivated: true,
                    isSubmitted: true,
                    status: 'Approved',
                    availableRoles: ['User', role],
                    profileCompleted: true,
                    activationToken: 'activated',
                    refreshToken: 'refreshed',
                });

                globalCount++;
            }
        }

        let createdCount = 0;
        for (const userData of usersToCreate) {
            // Check if user exists
            const exists = await User.findOne({ email: userData.email });
            if (!exists) {
                await User.create(userData);
                createdCount++;
                console.log(`Created: ${userData.fullName} (${userData.role}) - ${userData.labName}`);
            } else {
                // Update status if needed
                if (exists.status !== 'Approved') {
                    exists.status = 'Approved';
                    await exists.save({ validateBeforeSave: false });
                    console.log(`Updated status to Approved: ${userData.email}`);
                } else {
                    console.log(`Skipped (Exists & Approved): ${userData.email}`);
                }
            }
        }

        console.log(`\nSeeding completed. Created ${createdCount} new users.`);
        process.exit(0);

    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seedUsers();
