import mongoose from 'mongoose';
import { SystemConfig } from '../src/models/systemConfig.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedConfig = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const key = 'APPROVED_DESIGNATIONS';
        const value = 'Director, Head of Department, Section Officer, Senior Principal Scientist, Principal Scientist, Scientist';
        const description = 'Comma-separated list of designations authorized to approve forms.';

        await SystemConfig.findOneAndUpdate(
            { key },
            { key, value, description },
            { upsert: true, new: true }
        );

        console.log(`Successfully seeded ${key} with value: ${value}`);
        mongoose.disconnect();
    } catch (err) {
        console.error('Error seeding config:', err);
        process.exit(1);
    }
};

seedConfig();
