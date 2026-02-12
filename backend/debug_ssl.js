import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

console.log("CWD:", process.cwd());
console.log("ENV SSL_ENABLED:", process.env.SSL_ENABLED);

const sslEnabled = String(process.env.SSL_ENABLED).trim().toLowerCase() === 'true';
console.log("Parsed sslEnabled:", sslEnabled);

const keyPath = process.env.SSL_KEY_PATH;
const certPath = process.env.SSL_CERT_PATH;

console.log("Key Path:", keyPath);
console.log("Cert Path:", certPath);

if (sslEnabled) {
    if (fs.existsSync(keyPath)) {
        console.log("Key file exists.");
    } else {
        console.error("Key file MISSING at", path.resolve(keyPath));
    }

    if (fs.existsSync(certPath)) {
        console.log("Cert file exists.");
    } else {
        console.error("Cert file MISSING at", path.resolve(certPath));
    }

    try {
        const key = fs.readFileSync(keyPath);
        const cert = fs.readFileSync(certPath);
        console.log("Successfully read key and cert.");
    } catch (e) {
        console.error("Error reading certs:", e.message);
    }

} else {
    console.log("SSL is DISABLED in configuration.");
}
