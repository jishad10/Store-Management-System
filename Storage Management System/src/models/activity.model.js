import mongoose, { Schema } from "mongoose";

const ActivitySchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        folderId: {
            type: Schema.Types.ObjectId,
            ref: "Folder"
        },
        itemId: {
            type: Schema.Types.ObjectId,
            ref: "Item"
        },
        action: {
            type: String,
            enum: ["created", "updated", "deleted", "favorited", "copied", "renamed", "duplicated"],
            required: true
        }
    },
    { timestamps: true }
);

export const Activity = mongoose.model("Activity", ActivitySchema);
