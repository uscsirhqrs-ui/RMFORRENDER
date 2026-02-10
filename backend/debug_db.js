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
    await mongoose.connect(process.env.MONGODB_URI);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    for (const name of ['users', 'globalreferences', 'localreferences', 'globalmovements', 'localmovements']) {
        const count = await mongoose.connection.db.collection(name).countDocuments();
        console.log(`Collection: ${name}, Count: ${count}`);
        if (count > 0) {
            const sample = await mongoose.connection.db.collection(name).findOne();
            console.log(`Sample from ${name}:`, JSON.stringify(sample, null, 2));
        }
    }
    process.exit(0);
}
debug();
