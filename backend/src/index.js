/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import dotenv from "dotenv";

dotenv.config({
    path: "./.env"
})

import connectDB from "./db/index.js"
import { app } from './app.js'


import { seedAdmin } from './utils/seed.js';

connectDB()
    .then(async () => {
        await seedAdmin();
        
        const PORT = process.env.PORT || 8000;

        if (process.env.SSL_ENABLED === 'true') {
            try {
                const fs = await import('fs');
                const https = await import('https');
                
                const keyPath = process.env.SSL_KEY_PATH;
                const certPath = process.env.SSL_CERT_PATH;

                if (!keyPath || !certPath) {
                    throw new Error("SSL enabled but key or cert path missing in environment variables.");
                }

                const options = {
                    key: fs.readFileSync(keyPath),
                    cert: fs.readFileSync(certPath)
                };

                https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
                    console.log(`SECURE Server is running on port ${PORT} (HTTPS)`);
                });
            } catch (error) {
                console.error("Failed to start HTTPS server:", error.message);
                console.log("Falling back to HTTP...");
                app.listen(PORT, '0.0.0.0', () => {
                    console.log(`Server is running on port ${PORT} (HTTP - Fallback)`);
                })
            }
        } else {
            app.listen(PORT, '0.0.0.0', () => {
                console.log(`Server is running on port ${PORT}`);
            })
        }
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB", err);
        process.exit(1); // Exit process with failure   
    })


/*
import express from "express";
const app = express();

; (async () => {
    try { 

        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on('error', (err) => {
            console.error("MongoDB connection error:", err);
            throw err;
        });

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`));

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
})()
*/
