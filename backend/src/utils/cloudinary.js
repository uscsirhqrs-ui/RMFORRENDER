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

import { v2 as cloudinary } from "cloudinary"
import fs from "fs"


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET

});

//console.log("cloudinary config: ", cloudinary.config());

const uploadOnCloudinary = async (localFilePath) => {
    try {


        console.log("cloudinary receved localFilePath: ", localFilePath);

        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        console.log("file is uploaded on cloudinary ", response.secure_url || response.url);
        fs.unlinkSync(localFilePath)
        // Return structured data to ensure we have secure_url
        return {
            url: response.secure_url || response.url,
            publicId: response.public_id
        };

    } catch (error) {
        console.log("error in uploading on cloudinary ", error);
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;
        const response = await cloudinary.uploader.destroy(publicId);
        return response;
    } catch (error) {
        console.log("error in deleting from cloudinary ", error);
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }