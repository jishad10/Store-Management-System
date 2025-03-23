import mongoose, { Schema } from "mongoose";
import { Item } from "./item.model.js";

const FavoriteSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        itemId: {
            type: Schema.Types.ObjectId,
            ref: "Item",
            required: true
        }
    },
    { timestamps: true }
);



// Prevent duplicate favorites
FavoriteSchema.index({ userId: 1, itemId: 1 }, { unique: true });


// Automatically update isFavorite in Item when a favorite is added
FavoriteSchema.post("save", async function (doc) {
    await Item.findByIdAndUpdate(doc.itemId, { isFavorite: true });
});


// Automatically update isFavorite in Item when a favorite is removed
FavoriteSchema.post("remove", async function (doc) {
    const favoriteCount = await mongoose.model("Favorite").countDocuments({ itemId: doc.itemId });
    if (favoriteCount === 0) {
        await Item.findByIdAndUpdate(doc.itemId, { isFavorite: false });
    }
});

export const Favorite = mongoose.model("Favorite", FavoriteSchema);
