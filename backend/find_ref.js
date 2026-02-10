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

async function debug() {
    const uri = process.env.MONGODB_URI;
    const client = await mongoose.connect(uri);
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Available Databases:', dbs.databases.map(d => d.name));

    const commonDbs = ['references_management_portal', 'test', 'us_csir_hqrs'];
    for (const dbName of commonDbs) {
        console.log(`\n--- Inspecting Database: ${dbName} ---`);
        const db = mongoose.connection.useDb(dbName);

        const gRefs = await db.collection('globalreferences').find({ refId: 'GREF-9EBEB80' }).toArray();
        console.log(`Global GREF-9EBEB80 in ${dbName}:`, gRefs.length > 0 ? JSON.stringify(gRefs[0], null, 2) : 'Not found');

        const lRefs = await db.collection('localreferences').find({ refId: 'GREF-9EBEB80' }).toArray();
        console.log(`Local GREF-9EBEB80 in ${dbName}:`, lRefs.length > 0 ? JSON.stringify(lRefs[0], null, 2) : 'Not found');

        if (gRefs.length === 0 && lRefs.length === 0) {
            const countG = await db.collection('globalreferences').countDocuments();
            const countL = await db.collection('localreferences').countDocuments();
            console.log(`Total G: ${countG}, Total L: ${countL}`);
            if (countG > 0) {
                const sample = await db.collection('globalreferences').findOne();
                console.log('Sample G refId:', sample.refId);
            }
        }
    }
    process.exit(0);
}
debug();
