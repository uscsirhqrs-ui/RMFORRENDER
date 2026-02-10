import mongoose from 'mongoose';
import { SystemConfig } from '../src/models/systemConfig.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const listConfigs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const configs = await SystemConfig.find({});
        console.log(`\nFound ${configs.length} configs:`);
        configs.forEach(c => {
            console.log(`- Key: ${c.key}`);
            console.log(`  Value Type: ${typeof c.value}`);
            console.log(`  Value: ${JSON.stringify(c.value).substring(0, 100)}...`);
        });

        mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

listConfigs();
