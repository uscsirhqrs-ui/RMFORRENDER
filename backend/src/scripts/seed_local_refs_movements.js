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
import { LocalReference } from '../models/localReference.model.js';
import { LocalMovement } from '../models/localRefMovement.model.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_NAME = 'references_management_portal';

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

const generateRefId = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
};

const seedLocalReferences = async () => {
    await connectDB();

    try {
        // 1. Get all Labs
        const labs = await User.distinct("labName");
        console.log(`Found ${labs.length} labs:`, labs);

        let totalRefs = 0;
        let totalMovements = 0;

        for (const lab of labs) {
            if (!lab) continue;

            // 2. Fetch eligible users for this lab
            // Exclude Superadmin role to satisfy requirements
            const users = await User.find({
                labName: lab,
                role: { $ne: 'Superadmin' },
                status: 'Approved'
            });

            if (users.length < 2) {
                console.log(`Skipping lab ${lab}: Not enough users (${users.length})`);
                continue;
            }

            console.log(`Processing Lab: ${lab} (${users.length} users)`);

            const referencesToCreate = [];
            const movementsToCreate = [];

            // 3. Create 20 References
            for (let i = 0; i < 20; i++) {
                // A. Select Creator and Initial Receiver
                const creator = users[Math.floor(Math.random() * users.length)];
                let initialReceiver = users[Math.floor(Math.random() * users.length)];

                // Ensure receiver != creator
                while (initialReceiver._id.toString() === creator._id.toString()) {
                    initialReceiver = users[Math.floor(Math.random() * users.length)];
                }

                const refId = generateRefId();
                const subject = `Ref for ${lab} - Project ${Math.floor(Math.random() * 1000)}`;
                // Random past date within last 30 days
                const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));

                // Initialize Reference Object
                const reference = new LocalReference({
                    refId: refId,
                    subject: subject,
                    remarks: `Initial remarks for ${refId}`,
                    status: 'Open', // Will update after movements
                    priority: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
                    createdBy: creator._id,
                    // markedTo will be the LAST receiver in the chain
                    markedTo: initialReceiver._id, // Placeholder, updated later
                    participants: [creator._id, initialReceiver._id],
                    labName: lab,
                    createdByDetails: {
                        fullName: creator.fullName,
                        email: creator.email,
                        labName: creator.labName,
                        designation: creator.designation
                    },
                    markedToDetails: [{ // Placeholder
                        _id: initialReceiver._id,
                        fullName: initialReceiver.fullName,
                        email: initialReceiver.email,
                        labName: initialReceiver.labName,
                        designation: initialReceiver.designation
                    }],
                    markedToDivision: initialReceiver.division || 'General',
                    createdAt: createdAt,
                    updatedAt: createdAt
                });

                // B. Generate Movement Query Chain (At least 3 movements)
                // Movement 1: Creator -> Receiver (Creation)
                const movement1 = new LocalMovement({
                    reference: reference._id,
                    markedTo: [initialReceiver._id], // Array as per schema
                    performedBy: creator._id,
                    statusOnMovement: 'Open',
                    remarks: 'Reference Created',
                    movementDate: createdAt
                });
                movementsToCreate.push(movement1);

                // Chain Tracking
                let currentHolder = initialReceiver;
                let lastMovementDate = new Date(createdAt.getTime() + 1000 * 60 * 60); // +1 hour

                // Random number of additional movements (2 to 4) -> Total 3 to 5 levels
                const extraMoves = 2 + Math.floor(Math.random() * 3);

                for (let m = 0; m < extraMoves; m++) {
                    // Pick next receiver
                    let nextReceiver = users[Math.floor(Math.random() * users.length)];
                    // Ensure next != current
                    while (nextReceiver._id.toString() === currentHolder._id.toString()) {
                        nextReceiver = users[Math.floor(Math.random() * users.length)];
                    }

                    // Add to participants
                    if (!reference.participants.includes(nextReceiver._id)) {
                        reference.participants.push(nextReceiver._id);
                    }

                    // Advance time
                    const moveDate = new Date(lastMovementDate.getTime() + Math.random() * 24 * 60 * 60 * 1000);
                    lastMovementDate = moveDate;

                    const status = (m === extraMoves - 1 && Math.random() > 0.7) ? 'Closed' : 'In Progress'; // 30% chance to close on last move

                    const move = new LocalMovement({
                        reference: reference._id,
                        markedTo: [nextReceiver._id],
                        performedBy: currentHolder._id,
                        statusOnMovement: status,
                        remarks: `Forwarding to ${nextReceiver.fullName} (Step ${m + 2})`,
                        movementDate: moveDate
                    });
                    movementsToCreate.push(move);

                    // Update State for next iteration
                    currentHolder = nextReceiver;

                    // Update Reference Final State
                    reference.markedTo = nextReceiver._id;
                    reference.status = status;
                    reference.markedToDivision = nextReceiver.division || 'General';
                    reference.updatedAt = moveDate;
                    reference.markedToDetails = [{
                        _id: nextReceiver._id,
                        fullName: nextReceiver.fullName,
                        email: nextReceiver.email,
                        labName: nextReceiver.labName,
                        designation: nextReceiver.designation
                    }];
                }

                referencesToCreate.push(reference);
            }

            // Save Batch for Lab
            if (referencesToCreate.length > 0) {
                await LocalReference.insertMany(referencesToCreate);
                await LocalMovement.insertMany(movementsToCreate);
                totalRefs += referencesToCreate.length;
                totalMovements += movementsToCreate.length;
                console.log(`  -> Created ${referencesToCreate.length} refs and ${movementsToCreate.length} movements for ${lab}`);
            }
        }

        console.log(`\nCOMPLETED: Created ${totalRefs} references and ${totalMovements} movements.`);
        process.exit(0);

    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
};

seedLocalReferences();
