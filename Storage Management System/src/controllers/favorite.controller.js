import { Favorite } from "../models/favorite.model.js";
import { Item } from "../models/item.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


export const addFavorite = asyncHandler(async (req, res) => {
    const { itemId } = req.body;
    const userId = req.user.id;

    const item = await Item.findById(itemId).lean();
    if (!item) {
        throw new ApiError(404, "Item not found");
    }

    const existingFavorite = await Favorite.exists({ userId, itemId });
    if (existingFavorite) {
        throw new ApiError(400, "Item is already in favorites");
    }

    await Favorite.create({ userId, itemId });

    // Update Item.isFavorite to true
    await Item.findByIdAndUpdate(itemId, { isFavorite: true });

    return res.status(201).json(new ApiResponse(201, "Added to favorites"));
});


export const removeFavorite = asyncHandler(async (req, res) => {
    const { id } = req.params; 
    const userId = req.user.id;

    const favorite = await Favorite.findOneAndDelete({ _id: id, userId });
    if (!favorite) {
        throw new ApiError(404, "Favorite not found");
    }

    const favoriteCount = await Favorite.countDocuments({ itemId: favorite.itemId });
    if (favoriteCount === 0) {
        await Item.findByIdAndUpdate(favorite.itemId, { isFavorite: false });
    }

    return res.status(200).json(new ApiResponse(200, "Removed from favorites"));
});


export const toggleFavorite = asyncHandler(async (req, res) => {
    const { itemId } = req.body;
    const userId = req.user.id;

    const item = await Item.findById(itemId).lean();
    if (!item) {
        throw new ApiError(404, "Item not found");
    }

    const existingFavorite = await Favorite.findOne({ userId, itemId });

    if (existingFavorite) {
        await Favorite.findByIdAndDelete(existingFavorite._id);
        const favoriteCount = await Favorite.countDocuments({ itemId });
        if (favoriteCount === 0) {
            await Item.findByIdAndUpdate(itemId, { isFavorite: false });
        }
        return res.status(200).json(new ApiResponse(200, "Removed from favorites"));
    } else {
        await Favorite.create({ userId, itemId });
        await Item.findByIdAndUpdate(itemId, { isFavorite: true });

        return res.status(201).json(new ApiResponse(201, "Added to favorites"));
    }
});


export const getUserFavorites = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const favorites = await Favorite.find({ userId }).populate("itemId").lean();

    return res.status(200).json(new ApiResponse(200, "User favorites", favorites));
});


export const checkFavoriteStatus = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const userId = req.user.id;

    const isFavorite = await Favorite.exists({ userId, itemId });

    return res.status(200).json(new ApiResponse(200, "Favorite status", { isFavorite: !!isFavorite }));
});
