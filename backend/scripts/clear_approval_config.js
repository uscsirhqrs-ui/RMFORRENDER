import mongoose from 'mongoose';
import { SystemConfig } from '../src/models/systemConfig.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const clearConfig = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const key = 'APPROVED_DESIGNATIONS';

        const result = await SystemConfig.deleteOne({ key });

        if (result.deletedCount > 0) {
            console.log(`Successfully removed ${key} configuration.`);
        } else {
            console.log(`${key} not found or already removed.`);
        }

        mongoose.disconnect();
    } catch (err) {
        console.error('Error clearing config:', err);
        process.exit(1);
    }
};

clearConfig();
