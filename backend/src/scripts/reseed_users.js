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

dotenv.config({ path: '.env' });

const DB_NAME = "testing_portal_references_management";

async function deleteAndReseed() {
    try {
        console.log("Connecting to MongoDB...");
        const uri = process.env.MONGODB_URI?.replace(/\/$/, "");
        await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log(`Connected to ${DB_NAME}\n`);

        const userColl = mongoose.connection.collection('users');

        // Delete all existing test users
        const deleteResult = await userColl.deleteMany({
            email: { $regex: /^test\./i }
        });
        console.log(`Deleted ${deleteResult.deletedCount} existing test users\n`);

        // Now seed fresh users
        const { DEFAULT_LABS, DEFAULT_DESIGNATIONS, DEFAULT_DIVISIONS } = await import('../controllers/settings.controller.js');
        const bcrypt = await import('bcrypt');

        const labs = DEFAULT_LABS.slice(0, 5);
        const password = await bcrypt.default.hash("Test@123", 10);
        const testUsers = [];
        let mobileBase = 9876543210;

        for (const lab of labs) {
            for (let i = 1; i <= 5; i++) {
                const labShort = lab.split('-')[1].toLowerCase();
                const userName = `Test User ${i} ${lab.split('-')[1]}`;
                const email = `test.${labShort}.${i}@csir.res.in`;
                const mobileNo = (mobileBase--).toString();

                testUsers.push({
                    fullName: userName,
                    email: email,
                    password: password,
                    labName: lab,
                    designation: DEFAULT_DESIGNATIONS[(i - 1) % DEFAULT_DESIGNATIONS.length],
                    division: DEFAULT_DIVISIONS[(i - 1) % DEFAULT_DIVISIONS.length],
                    mobileNo: mobileNo,
                    role: "User",
                    availableRoles: ["User"],
                    status: "Approved",
                    isActivated: true,
                    isSubmitted: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }

        const insertResult = await userColl.insertMany(testUsers);
        console.log(`✅ Created ${insertResult.insertedCount} new users\n`);

        // Verify
        const finalCount = await userColl.countDocuments({ email: { $regex: /^test\./i } });
        console.log(`Total test users in database: ${finalCount}\n`);

        const allUsers = await userColl.find({ email: { $regex: /^test\./i } }).toArray();
        console.log("Users by lab:");
        const byLab = {};
        allUsers.forEach(u => {
            if (!byLab[u.labName]) byLab[u.labName] = [];
            byLab[u.labName].push(u.email);
        });
        Object.keys(byLab).sort().forEach(lab => {
            console.log(`\n${lab} (${byLab[lab].length} users):`);
            byLab[lab].forEach(email => console.log(`  - ${email}`));
        });

        await mongoose.disconnect();
        console.log("\n✅ Seeding complete!");
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

deleteAndReseed();
