import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DB_NAME = "references_management_portal";

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        const uri = process.env.MONGODB_URI?.replace(/\/$/, "");
        await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log("Connected successfully.");

        const userColl = mongoose.connection.collection('users');

        const labs = ["CSIR-CCMB", "CSIR-NCL", "CSIR-IICT", "CSIR-CDRI"];
        const password = await bcrypt.hash("Test@123", 10);

        const testUsers = [];
        let mobileBase = 9876543210;

        for (const lab of labs) {
            for (let i = 1; i <= 2; i++) {
                const labShort = lab.split('-')[1].toLowerCase();
                const userName = `Test User ${i} ${lab.split('-')[1]}`;
                const email = `test.${labShort}.${i}@csir.res.in`;
                const mobileNo = (mobileBase--).toString();

                testUsers.push({
                    fullName: userName,
                    email: email,
                    password: password,
                    labName: lab,
                    designation: i === 1 ? "Principal Scientist" : "Sr. Principal Scientist",
                    division: i === 1 ? "HR-I" : "Finance and Accounts",
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

        console.log(`Seeding ${testUsers.length} test users...`);

        for (const u of testUsers) {
            const exists = await userColl.findOne({ email: u.email });
            if (!exists) {
                await userColl.insertOne(u);
                console.log(`Created user: ${u.email} (${u.labName})`);
            } else {
                console.log(`User already exists: ${u.email}`);
            }
        }

        console.log("Seeding complete.");
        await mongoose.disconnect();
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

run();
