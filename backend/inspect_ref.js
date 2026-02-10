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
import { LocalReference } from './src/models/localReference.model.js';
import { LocalMovement } from './src/models/localRefMovement.model.js';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;

async function inspect() {
    const uri = MONGODB_URI?.replace(/\/$/, "");
    await mongoose.connect(`${uri}/references_management_portal`);
    const ref = await LocalReference.findOne({ refId: 'LREF-3389FB2' }).lean();
    console.log('Reference Details:', JSON.stringify({
        refId: ref?.refId,
        createdBy: ref?.createdBy,
        createdByDetails: ref?.createdByDetails,
        markedTo: ref?.markedTo,
        markedToDetails: ref?.markedToDetails
    }, null, 2));

    const movs = await LocalMovement.find({ reference: ref._id }).lean();
    console.log('Movements:', movs.map(m => ({
        id: m._id,
        performedBy: m.performedBy,
        performedByDetails: m.performedByDetails,
        markedTo: m.markedTo,
        markedToDetails: m.markedToDetails
    })));
    process.exit(0);
}
inspect();
