import mongoose, { Schema } from "mongoose";
import { Item } from "./item.model.js";

const FolderSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        parentId: {
            type: Schema.Types.ObjectId,
            ref: "Folder",
            default: null
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ["general", "notes", "images", "pdfs"],
            default: "general"
        },
        totalItems: {
            type: Number,
            default: 0
        },
        storageUsed: {
            type: Number,
            default: 0
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);



FolderSchema.pre(["find", "findOne", "findById"], function (next) {
    if (!this.getFilter().includeDeleted) {
        this.where({ isDeleted: false });
    }
    next();
});

/* Soft delete cascading: Mark items & subfolders as deleted */
FolderSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
    console.log(`Soft deleting folder: ${this._id}`);
    await Item.updateMany({ folderId: this._id }, { isDeleted: true });
    await mongoose.model("Folder").updateMany({ parentId: this._id }, { isDeleted: true });
    next();
});

/* Check folder ownership */
FolderSchema.methods.isOwner = function (userId) {
    return String(this.userId) === String(userId);
};

export const Folder = mongoose.model("Folder", FolderSchema);
