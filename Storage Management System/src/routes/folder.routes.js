import { Router } from "express";
import {
  createFolder, 
  getFolders, 
  getFolderById, 
  updateFolder, 
  moveFolder, 
  deleteFolder, 
  getFolderStats, 
  getFoldersByType, 
  copyFolder,
} from "../controllers/folder.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.post("/", verifyJWT, createFolder);
router.get("/", verifyJWT, getFolders);

router.get("/stats", verifyJWT, getFolderStats);
router.get("/:folderId", verifyJWT, getFolderById);
router.put("/:folderId", verifyJWT, updateFolder);
router.delete("/:folderId", verifyJWT, deleteFolder);

router.put("/:folderId/move", verifyJWT, moveFolder);
router.post("/:folderId/copy", verifyJWT, copyFolder);

router.get("/type/:type", verifyJWT, getFoldersByType);


export default router;
