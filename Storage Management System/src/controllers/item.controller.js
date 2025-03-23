import mongoose from "mongoose";

import { Item } from "../models/item.model.js";
import { Folder } from "../models/folder.model.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Activity } from "../models/activity.model.js";


export const createItem = asyncHandler(async (req, res) => {
    try {
        const { name, type, content, folderId } = req.body;
        const userId = req.user.id;

        let fileUrl = "";
        let fileSize = 0;

        console.log("Received Folder ID:", folderId);
        console.log("Received User ID:", userId);

        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            throw new ApiError(400, "Invalid folderId format");
        }

        const folder = await Folder.findById(folderId);
        if (!folder) {
            throw new ApiError(404, "Folder not found");
        }

        if (folder.userId.toString() !== userId) {
            throw new ApiError(403, "Unauthorized access to this folder");
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Handle file upload
        if (req.file) {
            console.log("Uploading file to Cloudinary...");
            const uploadResult = await uploadOnCloudinary(req.file.path);

            console.log("Cloudinary Upload Result:", uploadResult);
            console.log("File Details from Multer:", req.file);

            if (uploadResult && uploadResult.url) {
                fileUrl = uploadResult.url;

                let fileSizeInBytes = Number(uploadResult.bytes ?? req.file.size ?? 0);

                if (fileSizeInBytes <= 0 || isNaN(fileSizeInBytes)) {
                    console.error("❌ Error: File size is zero or invalid.");
                    throw new ApiError(500, "File upload failed - Invalid file size");
                }

                // Convert to appropriate unit
                let fileSizeMB = fileSizeInBytes / (1024 * 1024); 
                let fileSizeForLog = fileSizeMB < 1 
                    ? fileSizeInBytes / 1024 
                    : fileSizeMB; 
                
                let unit = fileSizeMB < 1 ? "KB" : "MB";

                console.log(`✅ File Uploaded: ${fileUrl} | Size: ${fileSizeForLog.toFixed(2)} ${unit}`);

                fileSize = Number(fileSizeMB.toFixed(2)); 
            } else {
                throw new ApiError(500, "File upload failed - No URL received from Cloudinary");
            }
        }

        if (user.usedStorage + fileSize > user.totalStorage) {
            throw new ApiError(400, "Not enough storage space available");
        }

        if (type === "note" && !content) {
            throw new ApiError(400, "Content is required for notes");
        }

        if (type !== "note" && !req.file) {
            throw new ApiError(400, "File upload required for images and PDFs");
        }

        let newName = name;
        let counter = 1;
        while (await Item.findOne({ folderId, userId, name: newName })) {
            newName = `${name} (Copy ${counter})`;
            counter++;
        }

        const item = await Item.create({
            name: newName,
            type,
            content,
            fileUrl,
            fileSize,
            folderId,
            userId,
        });

        // Update folder's total items & storage
        folder.totalItems += 1;
        folder.storageUsed += fileSize;
        await folder.save();


        await User.findByIdAndUpdate(userId, {
            $inc: { usedStorage: fileSize }
        });

        // item creation activity
        await Activity.create({
            userId,
            folderId,
            itemId: item._id,
            action: "created"
        });

        res.status(201).json(new ApiResponse(201, item, "Item created successfully"));
    } catch (error) {
        console.error("Error in createItem:", error.message);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});


export const getAllItems = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const items = await Item.find({ userId, isDeleted: false });

    res.status(200).json(new ApiResponse(200, items, "All items retrieved successfully"));
});


export const getItemsByFolder = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 10, sort = "desc" } = req.query;

    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) throw new ApiError(404, "Folder not found");

    const items = await Item.find({ folderId, userId, isDeleted: false })
        .sort({ createdAt: sort === "desc" ? -1 : 1 }) 
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    res.status(200).json(new ApiResponse(200, items, "Items retrieved successfully"));
});


export const getItemById = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const userId = req.user.id;

    const item = await Item.findOne({ _id: itemId, userId }).populate("folderId");
    
    if (!item) throw new ApiError(404, "Item not found");
    if (item.isDeleted) throw new ApiError(410, "Item has been deleted");

    res.status(200).json(new ApiResponse(200, item, "Item retrieved successfully"));
});


export const updateItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    const item = await Item.findOne({ _id: itemId, userId, isDeleted: false });
    if (!item) throw new ApiError(404, "Item not found");

    const existingItem = await Item.findOne({ folderId: item.folderId, userId, name });
    if (existingItem) throw new ApiError(400, "Item with the same name already exists");

    item.name = name;
    await item.save();

    res.status(200).json(new ApiResponse(200, item, "Item updated successfully"));
});


export const deleteItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const userId = req.user.id;

    const item = await Item.findOne({ _id: itemId, userId });
    if (!item) throw new ApiError(404, "Item not found");
    if (item.isDeleted) throw new ApiError(400, "Item is already deleted");

    item.isDeleted = true;
    await item.save();

    const folder = await Folder.findById(item.folderId);
    if (folder) {
        folder.totalItems -= 1;
        folder.storageUsed -= item.fileSize || 0;
        await folder.save();
    }

    res.status(200).json(new ApiResponse(200, item, "Item deleted successfully"));
});



export const restoreItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const userId = req.user.id;

    const item = await Item.findOne({ _id: itemId, userId, isDeleted: true });
    if (!item) throw new ApiError(404, "Item not found or already active");

    item.isDeleted = false;
    await item.save();

    // Update folder storage & totalItems
    const folder = await Folder.findById(item.folderId);
    if (folder) {
        folder.totalItems += 1;
        folder.storageUsed += item.fileSize || 0;
        await folder.save();
    }

    res.status(200).json(new ApiResponse(200, item, "Item restored successfully"));
});


export const moveItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { newFolderId } = req.body;
    const userId = req.user.id;

    const newFolder = await Folder.findOne({ _id: newFolderId, userId });
    if (!newFolder) throw new ApiError(404, "Target folder not found");

    const item = await Item.findOne({ _id: itemId, userId });
    if (!item) throw new ApiError(404, "Item not found");

    const oldFolder = await Folder.findById(item.folderId);

    item.folderId = newFolderId;
    await item.save();

    if (oldFolder) {
        oldFolder.totalItems -= 1;
        oldFolder.storageUsed -= item.fileSize || 0;
        await oldFolder.save();
    }

    newFolder.totalItems += 1;
    newFolder.storageUsed += item.fileSize || 0;
    await newFolder.save();

    res.status(200).json(new ApiResponse(200, item, "Item moved successfully"));
});


export const copyItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { targetFolderId } = req.body;
    const userId = req.user.id;

    const targetFolder = await Folder.findOne({ _id: targetFolderId, userId });
    if (!targetFolder) throw new ApiError(404, "Target folder not found");

    const originalItem = await Item.findOne({ _id: itemId, userId });
    if (!originalItem) throw new ApiError(404, "Item not found");

    // Create a copy of the item
    const newItem = await Item.create({
        name: `${originalItem.name} (Copy)`,
        type: originalItem.type,
        content: originalItem.content,
        fileUrl: originalItem.fileUrl,
        fileSize: originalItem.fileSize,
        folderId: targetFolderId,
        userId: userId,
        isFavorite: false
    });

    // Update folder storage & totalItems
    targetFolder.totalItems += 1;
    targetFolder.storageUsed += originalItem.fileSize || 0;
    await targetFolder.save();

    res.status(201).json(new ApiResponse(201, newItem, "Item copied successfully"));
});


export const getItemsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    const validTypes = ["note", "image", "pdf"];
    if (!validTypes.includes(type)) {
        throw new ApiError(400, "Invalid item type. Allowed: note, image, pdf");
    }

    const skip = (page - 1) * limit;
    const totalCount = await Item.countDocuments({ userId, type, isDeleted: false });

    const items = await Item.find({ userId, type, isDeleted: false })
        .skip(skip)
        .limit(Number(limit));

    res.status(200).json(new ApiResponse(200, { items, totalCount }, `Items of type '${type}' retrieved successfully`));
});


export const searchItems = asyncHandler(async (req, res) => {
try {
        const { name, type, folderId, isFavorite, isDeleted, page = 1, limit = 10 } = req.query;
        const userId = req.user.id;

        const filter = { userId };
        if (name) filter.name = new RegExp(name, "i"); 
        if (type) filter.type = type;
        if (mongoose.Types.ObjectId.isValid(folderId)) filter.folderId = folderId;
        if (isFavorite !== undefined) filter.isFavorite = isFavorite === "true";
        if (isDeleted !== undefined) filter.isDeleted = isDeleted === "true";

        // Pagination options
        const options = {
            limit: parseInt(limit, 10),
            skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            sort: { createdAt: -1 }, 
            select: "-__v", 
            lean: true
        };

        const items = await Item.find(filter, null, options);
        const totalItems = await Item.countDocuments(filter);

        res.json({ success: true, data: items, total: totalItems, page, limit });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
