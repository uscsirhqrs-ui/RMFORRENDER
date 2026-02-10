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
import { GlobalReference } from './src/models/globalReference.model.js';
import { LocalReference } from './src/models/localReference.model.js';
import { User } from './src/models/user.model.js';

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const processModel = async (Model, name) => {
            const cursor = Model.find({}).cursor();
            let count = 0;
            for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                let updated = false;

                // 1. CreatedByDetails
                if (doc.createdBy) {
                    const creator = await User.findById(doc.createdBy);
                    if (creator) {
                        doc.createdByDetails = {
                            fullName: creator.fullName,
                            email: creator.email,
                            labName: creator.labName,
                            designation: creator.designation,
                            division: creator.division
                        };
                        updated = true;
                    }
                }

                // 2. MarkedToDetails
                if (doc.markedTo && doc.markedTo.length > 0) {
                    const markers = await User.find({ _id: { $in: doc.markedTo } });
                    doc.markedToDetails = markers.map(u => ({
                        _id: u._id,
                        fullName: u.fullName,
                        email: u.email,
                        labName: u.labName,
                        designation: u.designation,
                        division: u.division
                    }));
                    if (markers.length > 0) {
                        doc.markedToDivision = markers[0].division;
                        updated = true;
                    }
                }

                if (updated) {
                    await doc.save();
                    count++;
                }
            }
            console.log(`Updated ${count} ${name} records.`);
        };

        console.log("Starting GlobalReference migration...");
        await processModel(GlobalReference, "GlobalReference");

        console.log("Starting LocalReference migration...");
        await processModel(LocalReference, "LocalReference");

        console.log("Migration complete.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
