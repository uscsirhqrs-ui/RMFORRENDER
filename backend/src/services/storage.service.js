/**
 * @fileoverview Service Layer - Business logic and external integrations
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-03
 */

import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

/**
 * Storage Service Class
 * Future-proof wrapper for file operations
 */
class StorageService {
    /**
     * Uploads a file to the active storage provider
     * @param {string} localPath - path to file on local server
     * @returns {Promise<Object>} - Contains url, publicId, and provider info
     */
    async upload(localPath) {
        // Current implementation uses Cloudinary
        // Later we can add logic here to switch providers based on env
        try {
            const result = await uploadOnCloudinary(localPath);
            if (!result) return null;

            return {
                url: result.url,
                id: result.publicId, // Mapping publicId to ID for abstraction
                provider: 'cloudinary',
                originalPath: localPath
            };
        } catch (error) {
            console.error("StorageService.upload error:", error);
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
            return null;
        }
    }

    /**
     * Deletes a file from the active storage provider
     * @param {string} id - publicId or file identifier
     * @param {string} provider - provider name
     */
    async delete(id, provider = 'cloudinary') {
        if (provider === 'cloudinary') {
            return await deleteFromCloudinary(id);
        }
        // Add other providers here later
        return null;
    }
}

export const storageService = new StorageService();
