import { Activity } from "../models/activity.model.js";

export const getActivitiesByDate = async (req, res) => {
    try {
        const { date } = req.query;
        const userId = req.user.id;

        if (!date) {
            return res.status(400).json({ message: "Date is required" });
        }

        // Convert date string to Date object
        const startDate = new Date(`${date}T00:00:00.000Z`);
        const endDate = new Date(`${date}T23:59:59.999Z`);

        console.log("Start Date:", startDate);
        console.log("End Date:", endDate);

        const activities = await Activity.find({
            userId,
            createdAt: { $gte: startDate, $lte: endDate }
        }).populate("folderId itemId");

        console.log("Activities Found:", activities);

        res.json({ activities });
    } catch (error) {
        console.error("Error fetching activities:", error);
        res.status(500).json({ message: "Server error" });
    }
};
