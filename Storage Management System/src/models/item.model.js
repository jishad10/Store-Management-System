import mongoose, { Schema } from "mongoose";
import { User } from "./user.model.js";
import { Folder } from "./folder.model.js"; 

const ItemSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        folderId: {
            type: Schema.Types.ObjectId,
            ref: "Folder",
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ["note", "image", "pdf"],
            required: true
        },
        content: {
            type: String 
        },
        fileUrl: {
            type: String 
        },
        fileSize: {
            type: Number,
            default: 0 
        },
        isFavorite: {
            type: Boolean,
            default: false
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);



/* Prevent storing invalid items in folders */
ItemSchema.pre("save", async function (next) {
    const folder = await Folder.findById(this.folderId);
    if (!folder || folder.isDeleted) {
        return next(new Error("Invalid or deleted folder"));
    }

    if (folder.type !== "general" && folder.type !== this.type + "s") {
        return next(new Error(`This folder only accepts ${folder.type} items`));
    }
    next();
});

/* Update user & folder storage when an item is created */
ItemSchema.post("save", async function (doc) {
    await User.findByIdAndUpdate(doc.userId, { $inc: { usedStorage: doc.fileSize } });
    await Folder.findByIdAndUpdate(doc.folderId, { $inc: { storageUsed: doc.fileSize } });
});

/* Update user & folder storage when an item is deleted */
ItemSchema.pre("remove", async function (next) {
    await User.findByIdAndUpdate(this.userId, { $inc: { usedStorage: -this.fileSize } });
    await Folder.findByIdAndUpdate(this.folderId, { $inc: { storageUsed: -this.fileSize } });
    next();
});

/* Update storage when fileSize is modified */
ItemSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();
    if (update.fileSize !== undefined) {
        const oldItem = await mongoose.model("Item").findById(this.getQuery()._id);
        if (oldItem) {
            const storageDifference = update.fileSize - oldItem.fileSize;
            await User.findByIdAndUpdate(oldItem.userId, { $inc: { usedStorage: storageDifference } });
            await Folder.findByIdAndUpdate(oldItem.folderId, { $inc: { storageUsed: storageDifference } });
        }
    }
    next();
});



export const Item = mongoose.model("Item", ItemSchema);
