import express from "express";
import {NotificationService} from "./handler.js";
import {asyncWrapper} from "../utils/index.js";
const notificationRoutes=express.Router();


notificationRoutes.post("/", asyncWrapper(NotificationService.getNotifications));

notificationRoutes.post("/send-push", asyncWrapper(NotificationService.sendNotificationToSingleUserPush));
notificationRoutes.post("/send-push-endpoint", asyncWrapper(NotificationService.sendPushNotification));
notificationRoutes.post("/send-email",asyncWrapper(NotificationService.sendNotificationToSingleUserEmail));

notificationRoutes.post("/send-all-push",asyncWrapper(NotificationService.sendNotificationUserPush));
notificationRoutes.post("/send-all-email",asyncWrapper(NotificationService.sendNotificationUserEmail));

// ADMIN-SPECIFIC ROUTES
notificationRoutes.post("/admin/send-push", asyncWrapper(NotificationService.sendAdminNotificationPush));
notificationRoutes.post("/admin/send-email", asyncWrapper(NotificationService.sendAdminNotificationEmail));



export default notificationRoutes;