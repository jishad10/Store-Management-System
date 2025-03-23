import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});



const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Upload file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // Safely remove local file after upload
        try {
            fs.unlinkSync(localFilePath);
        } catch (cleanupError) {
            console.warn("⚠️ Warning: Failed to delete local file:", cleanupError.message);
        }

        // Return properly named keys
        return {
            url: response.secure_url,  
            bytes: response.bytes,     
            format: response.format   
        };

    } catch (error) {
        console.error("Cloudinary Upload Error:", error.message);

        // Safe cleanup on failure
        try {
            fs.unlinkSync(localFilePath);
        } catch (cleanupError) {
            console.warn("Warning: Failed to delete local file:", cleanupError.message);
        }

        return null;
    }
};


export { uploadOnCloudinary };
