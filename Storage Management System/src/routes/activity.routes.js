import { Router } from "express";
import { getActivitiesByDate } from "../controllers/activity.controller.js"; 
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.get("/", verifyJWT, getActivitiesByDate);

export default router;
