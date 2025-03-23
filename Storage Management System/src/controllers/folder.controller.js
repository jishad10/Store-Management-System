import mongoose from "mongoose";
import { Activity } from "../models/activity.model.js";
import { Folder } from "../models/folder.model.js";
import { Item } from "../models/item.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";



export const createFolder = asyncHandler(async (req, res) => {
    const { name, type = "general", parentId = null } = req.body;
    const userId = req.user.id;

    if (!name) {
        throw new ApiError(400, "Folder name is required");
    }

    const validTypes = ["general", "notes", "images", "pdfs"];
    if (!validTypes.includes(type)) {
        throw new ApiError(400, "Invalid folder type");
    }

    const existingFolder = await Folder.findOne({ name, userId, parentId });
    if (existingFolder) {
        throw new ApiError(400, "Folder with this name already exists in this location");
    }

    const folder = await Folder.create({ name, type, userId, parentId, storageUsed: 0 });

    await Activity.create({
        userId,
        folderId: folder._id,
        action: "created"
    });

    res.status(201).json(new ApiResponse(201, folder, "Folder created successfully"));
});


export const getFolders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    const skip = (page - 1) * limit;
    const totalFolders = await Folder.countDocuments({ userId, isDeleted: false });
    
    const folders = await Folder.find({ userId, isDeleted: false })
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }); 

    res.status(200).json(new ApiResponse(200, { folders, totalFolders }, "Folders retrieved successfully"));
});



export const getFolderById = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const userId = req.user.id;

    const folder = await Folder.findOne({ _id: folderId, userId, isDeleted: false }).lean();

    if (!folder) {
        throw new ApiError(404, "Folder not found");
    }

    const items = await Item.find({ folderId, userId, isDeleted: false });
    folder.totalItems = items.length; 

    res.status(200).json(new ApiResponse(200, { ...folder, items }, "Folder fetched successfully"));
});


export const updateFolder = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    if (!name) {
        throw new ApiError(400, "New folder name is required");
    }

    const folder = await Folder.findOneAndUpdate(
        { _id: folderId, userId, isDeleted: false },
        { name },
        { new: true }
    );

    if (!folder) {
        throw new ApiError(404, "Folder not found");
    }

    res.status(200).json(new ApiResponse(200, folder, "Folder name updated successfully"));
});


export const deleteFolder = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const userId = req.user.id;

    const folder = await Folder.findOneAndUpdate(
        { _id: folderId, userId },
        { $set: { isDeleted: true } },
        { new: true }
    );

    if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
    }

    console.log("🚮 Folder deleted:", folder);
    res.status(200).json(new ApiResponse(200, folder, "Folder deleted successfully"));
});


export const getFolderStats = asyncHandler(async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json(new ApiResponse(401, null, "Unauthorized: No user ID found"));
        }

        const userId = req.user.id;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.error("Invalid User ID:", userId);
            return res.status(400).json(new ApiResponse(400, null, "Invalid user ID"));
        }

        const stats = await Folder.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), isDeleted: false } },
            {
                $group: {
                    _id: null,
                    totalFolders: { $sum: 1 },
                    totalStorageUsed: { $sum: "$storageUsed" },
                    totalItems: { $sum: "$totalItems" }
                }
            }
        ]);

        const result = stats[0] || { totalFolders: 0, totalStorageUsed: 0, totalItems: 0 };

        return res.status(200).json(new ApiResponse(200, result, "Folder stats retrieved successfully"));
    } catch (error) {
        console.error("Error getting folder stats:", error);
        return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
    }
});


export const getFoldersByType = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const folders = await Folder.find({ userId, type, isDeleted: false })
        .sort({ createdAt: -1 })  
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    res.status(200).json(new ApiResponse(200, folders, "Folders filtered by type"));
});


export const moveFolder = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { parentFolderId } = req.body;
    const userId = req.user.id;

    if (!parentFolderId) {
        throw new ApiError(400, "Parent folder ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(parentFolderId)) {
        throw new ApiError(400, "Invalid parent folder ID");
    }

    if (folderId === parentFolderId) {
        throw new ApiError(400, "A folder cannot be moved into itself");
    }

    let currentParent = await Folder.findOne({ _id: parentFolderId, userId, isDeleted: false });
    while (currentParent) {
        if (currentParent._id.toString() === folderId) {
            throw new ApiError(400, "A folder cannot be moved inside its own subfolder");
        }
        currentParent = await Folder.findOne({ _id: currentParent.parentFolderId, userId });
    }

    const folder = await Folder.findOneAndUpdate(
        { _id: folderId, userId, isDeleted: false },
        { parentFolderId },
        { new: true }
    );

    if (!folder) {
        throw new ApiError(404, "Folder not found");
    }

    res.status(200).json(new ApiResponse(200, folder, "Folder moved successfully"));
});


export const copyFolder = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const userId = req.user.id;

    // Function to recursively copy folders and items
    async function duplicateFolder(originalFolderId, newParentId) {
        // Find the original folder
        const originalFolder = await Folder.findOne({ _id: originalFolderId, userId });
        if (!originalFolder) throw new ApiError(404, "Folder not found");

        // Check if a folder with the same name exists in the target location
        let newFolderName = `${originalFolder.name} (Copy)`;
        let count = 1;
        while (await Folder.findOne({ name: newFolderName, parentFolderId: newParentId, userId })) {
            newFolderName = `${originalFolder.name} (Copy ${count++})`;
        }

        // Create a copy of the folder
        const newFolder = await Folder.create({
            name: newFolderName,
            type: originalFolder.type,
            userId: userId,
            parentFolderId: newParentId,  
            totalItems: originalFolder.totalItems,
            storageUsed: originalFolder.storageUsed,
        });

        const items = await Item.find({ folderId: originalFolderId });
        for (const item of items) {
            await Item.create({
                name: `${item.name} (Copy)`,
                type: item.type,
                content: item.content,
                fileUrl: item.fileUrl,
                fileSize: item.fileSize,
                folderId: newFolder._id,  
                userId: userId,
                isFavorite: false
            });
        }

        const subfolders = await Folder.find({ parentFolderId: originalFolderId, userId });
        for (const subfolder of subfolders) {
            await duplicateFolder(subfolder._id, newFolder._id);
        }

        return newFolder;
    }

    const copiedFolder = await duplicateFolder(folderId, null); 

    res.status(201).json(new ApiResponse(201, copiedFolder, "Folder and subfolders copied successfully"));
});
