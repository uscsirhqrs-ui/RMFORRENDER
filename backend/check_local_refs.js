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
import { User } from './src/models/user.model.js';

dotenv.config({ path: './.env' });

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const count = await LocalReference.countDocuments({});
        console.log(`Total Local References: ${count}`);

        if (count > 0) {
            const samples = await LocalReference.find({}).limit(5);
            console.log('Sample References Code/Lab:', samples.map(s => ({ id: s._id, refId: s.refId, labName: s.labName, subject: s.subject })));

            const uniqueLabs = await LocalReference.distinct('labName');
            console.log('Unique Lab Names in Refs:', uniqueLabs);
        }

        // Check user
        const adminUser = await User.findOne({ email: 'admin@csir.res.in' }); // Assuming this is the logged in user, or find general admins
        if (adminUser) {
            console.log('Admin User Lab:', adminUser.labName);
            console.log('Admin Roles:', adminUser.role, adminUser.availableRoles);
        } else {
            console.log('admin@csir.res.in not found, listing first 3 users');
            const users = await User.find({}).limit(3);
            console.log(users.map(u => ({ email: u.email, role: u.role, lab: u.labName })));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

checkData();
