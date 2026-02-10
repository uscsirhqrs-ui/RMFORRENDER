/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { User } from "../models/user.model.js";
import { SUPERADMIN_ROLE_NAME } from "../constants.js";

/**
 * Seeds a default Admin user if one does not exist.
 */
export const seedAdmin = async () => {
    try {

        const superadminExists = await User.findOne({ role: SUPERADMIN_ROLE_NAME });

        if (superadminExists) {

            return;
        }

        const email = process.env.ADMIN_EMAIL || "admin@csir.res.in";
        // Check if a standard Admin exists with this email and upgrade them
        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {

            existingAdmin.role = SUPERADMIN_ROLE_NAME;
            existingAdmin.status = "Approved";
            await existingAdmin.save();
            return;
        }



        const password = process.env.ADMIN_PASSWORD || "admin@123";

        const superadminUser = await User.create({
            fullName: "System Super Admin",
            email: email,
            password: password,
            role: SUPERADMIN_ROLE_NAME,
            availableRoles: [SUPERADMIN_ROLE_NAME],
            status: "Approved",
            labName: "SUPERADMIN",
            designation: "System Administrator",
            isActivated: true,
            mobileNo: "9999999999"
        });



    } catch (error) {
        console.error("Error seeding admin user:", error);
    }
};
