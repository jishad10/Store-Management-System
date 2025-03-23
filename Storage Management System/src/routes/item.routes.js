import { Router } from "express";
import {
    createItem,
    getAllItems,
    getItemsByFolder,
    getItemById,
    updateItem,
    deleteItem,
    restoreItem,
    moveItem,
    copyItem,
    getItemsByType,
    searchItems
} from "../controllers/item.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.get("/search", verifyJWT, searchItems);

router.post("/", verifyJWT, upload.single("file"), createItem);
router.get("/", verifyJWT, getAllItems);
router.get("/folder/:folderId", verifyJWT, getItemsByFolder);
router.get("/:itemId", verifyJWT, getItemById);
router.put("/:itemId", verifyJWT, updateItem);
router.delete("/:itemId", verifyJWT, deleteItem);

router.put("/:itemId/restore", verifyJWT, restoreItem);
router.put("/:itemId/move", verifyJWT, moveItem);
router.post("/:itemId/copy", verifyJWT, copyItem);

router.get("/type/:type", verifyJWT, getItemsByType);


export default router;
