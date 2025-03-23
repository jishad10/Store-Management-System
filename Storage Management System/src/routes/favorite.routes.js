import { Router } from "express";
import {
    addFavorite,
    removeFavorite,
    toggleFavorite,
    getUserFavorites,
    checkFavoriteStatus
} from "../controllers/favorite.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.post("/", verifyJWT, addFavorite);
router.delete("/:id", verifyJWT, removeFavorite);
router.post("/toggle", verifyJWT, toggleFavorite);
router.get("/", verifyJWT, getUserFavorites);
router.get("/check/:itemId", verifyJWT, checkFavoriteStatus);

export default router;
