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
import { LocalMovement } from './src/models/localRefMovement.model.js';
import { GlobalMovement } from './src/models/globalRefMovement.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const checkMovements = async () => {
    try {
        const DB_NAME = 'references_management_portal';
        const uri = process.env.MONGODB_URI?.replace(/\/$/, "");
        const connectionStr = `${uri}/${DB_NAME}`;

        await mongoose.connect(connectionStr);
        console.log('Connected to references_management_portal');

        const localCount = await LocalMovement.countDocuments({});
        console.log(`Total Local Movements: ${localCount}`);

        const globalCount = await GlobalMovement.countDocuments({});
        console.log(`Total Global Movements: ${globalCount}`);

        // Check if old collection exists (using mongoose connectiondb)
        const collections = await mongoose.connection.db.listCollections().toArray();
        const movementCollection = collections.find(c => c.name === 'movements');

        if (movementCollection) {
            const oldMovementCount = await mongoose.connection.db.collection('movements').countDocuments();
            console.log(`Total Old Generic Movements: ${oldMovementCount}`);
        } else {
            console.log('Movements (old) collection not found (or empty).');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

checkMovements();
