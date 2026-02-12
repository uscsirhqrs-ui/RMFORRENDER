import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, 'dist');
const targetDir = path.join(__dirname, '../backend/public');

async function copyDir(src, dest) {
    try {
        await fs.promises.mkdir(dest, { recursive: true });
        const entries = await fs.promises.readdir(src, { withFileTypes: true });

        for (let entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await copyDir(srcPath, destPath);
            } else {
                await fs.promises.copyFile(srcPath, destPath);
            }
        }
    } catch (err) {
        console.error('Error copying files:', err);
        process.exit(1);
    }
}

async function deploy() {


    if (!fs.existsSync(sourceDir)) {
        console.error('Error: dist directory not found. Run "npm run build" first.');
        process.exit(1);
    }

    // Clean target directory (optional, but good practice to remove old hashes)
    if (fs.existsSync(targetDir)) {

        try {
            await fs.promises.rm(targetDir, { recursive: true, force: true });
        } catch (err) {
            console.warn('Warning: Could not clean target directory. Overwriting...', err.message);
        }
    }

    await copyDir(sourceDir, targetDir);
}

deploy();
