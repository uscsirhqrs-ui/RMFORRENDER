import mongoose from 'mongoose';
import { SystemConfig } from '../src/models/systemConfig.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const debug = async () => {
    try {
        // Explicitly connect to the testing DB used by the app
        const uri = process.env.MONGODB_URI.replace(/\/$/, "");
        const dbName = 'testing_portal_references_management';
        await mongoose.connect(`${uri}/${dbName}`);
        console.log(`MongoDB Connected to ${dbName}`);

        console.log('\n--- Checking SystemConfig: APPROVAL_AUTHORITY_DESIGNATIONS ---');
        const config = await SystemConfig.findOne({ key: 'APPROVAL_AUTHORITY_DESIGNATIONS' });
        console.log('Config Found Object:', config);

        if (config && config.value) {
            let allowed = [];
            if (Array.isArray(config.value)) {
                console.log('Format: ARRAY');
                allowed = config.value;
            } else if (typeof config.value === 'string') {
                console.log('Format: STRING');
                allowed = config.value.split(',').map(d => d.trim());
            }

            console.log('Parsed Allowed Designations:', allowed);
        } else {
            console.log('Config Value is NULL or Missing');
        }

        mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

debug();
