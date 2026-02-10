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
import { DB_NAME } from './src/constants.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
    try {
        const uri = MONGODB_URI?.replace(/\/$/, "");
        await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log(`Connected to MongoDB: ${DB_NAME}`);

        const userMap = new Map();
        const users = await User.find({}).lean();
        users.forEach(u => userMap.set(u._id.toString(), u));
        console.log(`Found ${users.length} users`);

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

        const needsMigration = (doc) => {
            return !doc.createdByDetails ||
                !doc.markedToDetails ||
                (Array.isArray(doc.markedToDetails) && doc.markedToDetails.length === 0);
        };

        const needsMovementMigration = (doc) => {
            return !doc.performedByDetails ||
                !doc.markedToDetails ||
                (Array.isArray(doc.markedToDetails) && doc.markedToDetails.length === 0);
        };

        // 1. GlobalReferences
        console.log('Fetching GlobalReferences...');
        const globalRefs = await GlobalReference.find({});
        console.log(`Found ${globalRefs.length} GlobalReferences`);
        let gCount = 0;
        for (const ref of globalRefs) {
            if (needsMigration(ref)) {
                if (ref.createdBy) ref.createdByDetails = getUserDetails(ref.createdBy);
                if (ref.markedTo) {
                    const ids = Array.isArray(ref.markedTo) ? ref.markedTo : [ref.markedTo];
                    ref.markedToDetails = ids.map(id => getUserDetails(id)).filter(Boolean);
                }
                await ref.save();
                gCount++;
            }
        }
        console.log(`GlobalReferences updated: ${gCount}`);

        // 2. LocalReferences
        console.log('Fetching LocalReferences...');
        const localRefs = await LocalReference.find({});
        console.log(`Found ${localRefs.length} LocalReferences`);
        let lCount = 0;
        for (const ref of localRefs) {
            if (needsMigration(ref)) {
                if (ref.createdBy) ref.createdByDetails = getUserDetails(ref.createdBy);
                if (ref.markedTo) {
                    const ids = Array.isArray(ref.markedTo) ? ref.markedTo : [ref.markedTo];
                    ref.markedToDetails = ids.map(id => getUserDetails(id)).filter(Boolean);
                }
                await ref.save();
                lCount++;
            }
        }
        console.log(`LocalReferences updated: ${lCount}`);

        // 3. GlobalMovements
        console.log('Fetching GlobalMovements...');
        const globalMovs = await GlobalMovement.find({});
        console.log(`Found ${globalMovs.length} GlobalMovements`);
        let gmCount = 0;
        for (const mov of globalMovs) {
            if (needsMovementMigration(mov)) {
                if (mov.performedBy) mov.performedByDetails = getUserDetails(mov.performedBy);
                if (mov.markedTo) {
                    const ids = Array.isArray(mov.markedTo) ? mov.markedTo : [mov.markedTo];
                    mov.markedToDetails = ids.map(id => getUserDetails(id)).filter(Boolean);
                }
                await mov.save();
                gmCount++;
            }
        }
        console.log(`GlobalMovements updated: ${gmCount}`);

        // 4. LocalMovements
        console.log('Fetching LocalMovements...');
        const localMovs = await LocalMovement.find({});
        console.log(`Found ${localMovs.length} LocalMovements`);
        let lmCount = 0;
        for (const mov of localMovs) {
            if (needsMovementMigration(mov)) {
                if (mov.performedBy) mov.performedByDetails = getUserDetails(mov.performedBy);
                if (mov.markedTo) {
                    const ids = Array.isArray(mov.markedTo) ? mov.markedTo : [mov.markedTo];
                    mov.markedToDetails = ids.map(id => getUserDetails(id)).filter(Boolean);
                }
                await mov.save();
                lmCount++;
            }
        }
        console.log(`LocalMovements updated: ${lmCount}`);

        console.log('Migration v5 completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
