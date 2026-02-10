/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import crypto from 'crypto';

console.log('\n=== CSIR Reference Management Portal - Security Secret Generator ===\n');
console.log('IMPORTANT: Copy these values to your .env file immediately.');
console.log('Never commit these secrets to version control!\n');
console.log('-------------------------------------------------------------------\n');

// Generate strong secrets
const accessTokenSecret = crypto.randomBytes(64).toString('hex');
const refreshTokenSecret = crypto.randomBytes(64).toString('hex');
const resetPassTokenSecret = crypto.randomBytes(64).toString('hex');
const activationTokenSecret = crypto.randomBytes(64).toString('hex');

console.log('# JWT Secrets - Add these to your .env file:');
console.log(`ACCESS_TOKEN_SECRET=${accessTokenSecret}`);
console.log(`REFRESH_TOKEN_SECRET=${refreshTokenSecret}`);
console.log(`RESET_PASS_TOKEN_SECRET=${resetPassTokenSecret}`);
console.log(`ACTIVATION_TOKEN_SECRET=${activationTokenSecret}`);

console.log('\n-------------------------------------------------------------------\n');
console.log('✅ Secrets generated successfully!');
console.log('\n📋 Next Steps:');
console.log('1. Copy the secrets above to your .env file');
console.log('2. Restart your backend server');
console.log('3. Update production environment variables');
console.log('4. Delete this output from your terminal history\n');
