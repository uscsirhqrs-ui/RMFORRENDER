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
import { User } from './src/models/user.model.js';
import { GlobalReference } from './src/models/globalReference.model.js';
import { LocalReference } from './src/models/localReference.model.js';
import { GlobalMovement } from './src/models/globalRefMovement.model.js';
import { LocalMovement } from './src/models/localRefMovement.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env file');
    process.exit(1);
}

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const userMap = new Map();
        const users = await User.find({}).lean();
        users.forEach(u => userMap.set(u._id.toString(), u));

        const getUserDetails = (userId) => {
            const u = userMap.get(String(userId));
            if (!u) return null;
            return {
                _id: u._id,
                fullName: u.fullName,
                email: u.email,
                labName: u.labName,
                designation: u.designation,
                division: u.division
            };
        };

        // 1. Migrate GlobalReferences
        console.log('Migrating GlobalReferences...');
        const globalRefs = await GlobalReference.find({
            $or: [
                { createdByDetails: { $exists: false } },
                { markedToDetails: { $exists: false } }
            ]
        });

        for (const ref of globalRefs) {
            if (ref.createdBy) {
                ref.createdByDetails = getUserDetails(ref.createdBy);
            }
            if (ref.markedTo && Array.isArray(ref.markedTo)) {
                ref.markedToDetails = ref.markedTo.map(id => getUserDetails(id)).filter(Boolean);
            }
            await ref.save();
        }
        console.log(`GlobalReferences migrated: ${globalRefs.length}`);

        // 2. Migrate LocalReferences
        console.log('Migrating LocalReferences...');
        const localRefs = await LocalReference.find({
            $or: [
                { createdByDetails: { $exists: false } },
                { markedToDetails: { $exists: false } }
            ]
        });

        for (const ref of localRefs) {
            if (ref.createdBy) {
                ref.createdByDetails = getUserDetails(ref.createdBy);
            }
            if (ref.markedTo && Array.isArray(ref.markedTo)) {
                ref.markedToDetails = ref.markedTo.map(id => getUserDetails(id)).filter(Boolean);
            }
            await ref.save();
        }
        console.log(`LocalReferences migrated: ${localRefs.length}`);

        // 3. Migrate GlobalMovements
        console.log('Migrating GlobalMovements...');
        const globalMovs = await GlobalMovement.find({
            $or: [
                { performedByDetails: { $exists: false } },
                { markedToDetails: { $exists: false } }
            ]
        });

        for (const mov of globalMovs) {
            if (mov.performedBy) {
                mov.performedByDetails = getUserDetails(mov.performedBy);
            }
            if (mov.markedTo) {
                if (Array.isArray(mov.markedTo)) {
                    mov.markedToDetails = mov.markedTo.map(id => getUserDetails(id)).filter(Boolean);
                } else {
                    const detail = getUserDetails(mov.markedTo);
                    if (detail) mov.markedToDetails = [detail];
                }
            }
            await mov.save();
        }
        console.log(`GlobalMovements migrated: ${globalMovs.length}`);

        // 4. Migrate LocalMovements
        console.log('Migrating LocalMovements...');
        const localMovs = await LocalMovement.find({
            $or: [
                { performedByDetails: { $exists: false } },
                { markedToDetails: { $exists: false } }
            ]
        });

        for (const mov of localMovs) {
            if (mov.performedBy) {
                mov.performedByDetails = getUserDetails(mov.performedBy);
            }
            if (mov.markedTo) {
                if (Array.isArray(mov.markedTo)) {
                    mov.markedToDetails = mov.markedTo.map(id => getUserDetails(id)).filter(Boolean);
                } else {
                    const detail = getUserDetails(mov.markedTo);
                    if (detail) mov.markedToDetails = [detail];
                }
            }
            await mov.save();
        }
        console.log(`LocalMovements migrated: ${localMovs.length}`);

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
