import admin from "./firebase.js";
import UserModel from "../models/UserModel.js";
import NotificationsModel from "../models/NotificationsModel.js";

export class NotificationService {
  static async sendNotificationToSingleUserEmail(req, res) {
    const { to, subject, text } = req.body;

    try {
      console.log(`Send email to: ${to} | Subject: ${subject} | Text: ${text}`);

      return res
        .status(200)
        .json({ success: true, message: "Email sent (placeholder logic)." });
    } catch (error) {
      console.error("Error sending email:", error);
      return res
        .status(500)
        .json({ success: false, message: "Email notification failed.", error });
    }
  }
  static async sendNotificationToSingleUserPush(req, res) {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: token, title, or body",
      });
    }

    await NotificationService.sendNotificationToToken(token, title, body, data);

    return res.status(200).json({ success: true, message: response });
  }

  static async sendPushNotification(req, res) {
    const { message, messageType, chatId, id } = req.body;
    const user = await UserModel.findOne({ _id: id });
    const token = user?.fcmToken;
    
    if (token) {
      const data = {
        type: "chat",
        chatId: chatId,
        action: "open_chat",
        messageType: messageType
      };
      
      // Send FCM push notification
      await NotificationService.sendNotificationToToken(
        token,
        "New Message Received",
        message,
        data,
        messageType === "IMAGE" ? message : null
      );
      
      // Save to NotificationsModel for bell icon
      const notificationDoc = new NotificationsModel({
        userId: id,
        title: "New Message Received",
        message: message,
        image: messageType === "IMAGE" ? message : null,
        kind: "chat",
        targetAudience: "USERS",
        recipientType: "SELECTED_USERS",
        selectedUserIds: [id],
        recipientCount: 1,
        sendType: "push",
        deliveryStatus: {
          sent: 1,
          delivered: 1,
          failed: 0
        }
      });
      
      await notificationDoc.save();
    }

    return res.json({ status: true, message: "Push notification sent" });
  } // FOR CHAT MESSAGE
  static async sendNotificationToToken(token, title, body, data, image) {
    const notification = { title, body };

    if (image) {
      notification.image = image;
    }

    const message = {
      notification,
      token,
      data: data || {},
    };

    try {
      const response = await admin.messaging().send(message);
      console.log("Successfully sent message:", response);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  static async sendNotificationUserEmail(req, res) {}

  static async sendNotificationUserPush(req, res) {
    const { userType, selectType, ids, title, body } = req.body;

    let query = {};
    if (selectType.toString().toUpperCase() !== "ALL") {
      query = { _id: { $in: ids } };
    }

    try {
      const users = await UserModel.find(query).select("fcmToken").exec();
      const tokens = users.map((u) => u.fcmToken).filter((token) => !!token);

      if (tokens.length === 0) {
        return res.status(400).json({ message: "No valid FCM tokens found." });
      }

      const tokenChunks = chunkArray(tokens, 500);

      const message = {
        notification: {
          title,
          body,
        },
      };

      const sendBatchPromises = tokenChunks.map((chunk) => {
        const multicastMessage = { ...message, tokens: chunk };
        return admin
          .messaging()
          .sendEachForMulticast(multicastMessage)
          .then((response) => ({
            successCount: response.successCount,
            failureCount: response.failureCount,
          }))
          .catch((error) => {
            console.error("Batch error:", error);
            return { error: error.message };
          });
      });

      const results = await Promise.all(sendBatchPromises);

      return res.status(200).json({
        message: "Notifications sent",
        totalBatches: tokenChunks.length,
        summary: results,
      });
    } catch (err) {
      console.error("Error sending notifications:", err);
      return res
        .status(500)
        .json({ message: "Internal server error", error: err.message });
    }
  }

  // ADMIN-SPECIFIC NOTIFICATION METHODS

  static async sendAdminNotificationPush(req, res) {
    const {
      targetAudience,
      recipientType,
      selectedUserIds,
      title,
      message,
      image,
      notificationId,
    } = req.body;

    try {
      // Get target users based on admin targeting logic
      const targetUsers = await NotificationService._getAdminTargetUsers(
        targetAudience,
        recipientType,
        selectedUserIds
      );

      if (targetUsers.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No users found matching criteria",
          summary: [],
          totalBatches: 0,
          totalTokens: 0,
        });
      }

      // Extract FCM tokens
      const tokens = targetUsers
        .map((user) => user.fcmToken)
        .filter((token) => !!token);

      if (tokens.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No valid FCM tokens found",
          summary: [],
          totalBatches: 0,
          totalTokens: 0,
        });
      }

      // Send push notifications using core FCM logic
      const result = await NotificationService._sendBulkPushNotifications(
        tokens,
        title,
        message,
        image,
        {
          type: "admin_notification",
          notificationId: notificationId,
        }
      );

      return res.status(200).json({
        success: true,
        message: "Admin push notifications sent successfully",
        ...result,
      });
    } catch (error) {
      console.error("Error sending admin push notifications:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send admin push notifications",
        error: error.message,
      });
    }
  }

  static async sendAdminNotificationEmail(req, res) {
    const {
      targetAudience,
      recipientType,
      selectedUserIds,
      title,
      message,
      notificationId,
    } = req.body;

    try {
      // Get target users
      const targetUsers = await NotificationService._getAdminTargetUsers(
        targetAudience,
        recipientType,
        selectedUserIds
      );

      if (targetUsers.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No users found matching criteria",
          emailsSent: 0,
        });
      }

      // Filter users with valid email addresses
      const usersWithEmails = targetUsers.filter(
        (user) => user.email && user.email.includes("@")
      );

      if (usersWithEmails.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No valid email addresses found",
          emailsSent: 0,
        });
      }

      // TODO: Implement email sending logic when email service is ready
      console.log(
        `Admin email notification would be sent to ${usersWithEmails.length} users`
      );
      console.log("Email details:", { title, message, notificationId });

      return res.status(200).json({
        success: true,
        message:
          "Admin email notifications queued (email service not yet implemented)",
        emailsSent: usersWithEmails.length,
      });
    } catch (error) {
      console.error("Error sending admin email notifications:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send admin email notifications",
        error: error.message,
      });
    }
  }

  // CORE HELPER METHODS (Reusable FCM Logic)

  static async _getAdminTargetUsers(
    targetAudience,
    recipientType,
    selectedUserIds
  ) {
    let query = {};

    // If specific users are selected, return only those
    if (
      recipientType === "SELECTED_USERS" &&
      selectedUserIds &&
      selectedUserIds.length > 0
    ) {
      return await UserModel.find({ _id: { $in: selectedUserIds } })
        .select("_id fcmToken email")
        .exec();
    }

    // Filter by target audience type
    switch (targetAudience?.toUpperCase()) {
      case "USERS":
        query = {
          isRegisteredAsDriver: false,
          isRegisteredAsTransporter: false,
          isRegisteredAsIndependentCarOwner: false,
          isRegisterAsERickshaw: false,
          isRegisterAsRickshaw: false,
          isBlockedByAdmin: false,
        };
        break;
      case "DRIVERS":
        query = {
          isRegisteredAsDriver: true,
          isBlockedByAdmin: false,
        };
        break;
      case "TRANSPORTERS":
        query = {
          isRegisteredAsTransporter: true,
          isBlockedByAdmin: false,
        };
        break;
      case "INDEPENDENT_CAR_OWNER":
        query = {
          isRegisteredAsIndependentCarOwner: true,
          isBlockedByAdmin: false,
        };
        break;
      case "RICKSHAW":
        query = {
          isRegisterAsRickshaw: true,
          isBlockedByAdmin: false,
        };
        break;
      case "E_RICKSHAW":
        query = {
          isRegisterAsERickshaw: true,
          isBlockedByAdmin: false,
        };
        break;
      case "ALL_USERS":
      default:
        query = {
          isBlockedByAdmin: false,
        };
        break;
    }

    return await UserModel.find(query).select("_id fcmToken email").exec();
  }

  static async _sendBulkPushNotifications(
    tokens,
    title,
    body,
    image,
    customData = {}
  ) {
    const tokenChunks = chunkArray(tokens, 500);

    const message = {
      notification: {
        title,
        body,
      },
    };

    // Add image if provided
    if (image) {
      message.notification.image = image;
    }

    const sendBatchPromises = tokenChunks.map((chunk) => {
      const multicastMessage = { 
        ...message, 
        tokens: chunk,
        data: customData 
      };
      return admin
        .messaging()
        .sendEachForMulticast(multicastMessage)
        .then((response) => ({
          successCount: response.successCount,
          failureCount: response.failureCount,
        }))
        .catch((error) => {
          console.error("FCM batch error:", error);
          return { error: error.message };
        });
    });

    const results = await Promise.all(sendBatchPromises);

    // Calculate totals
    const totalSent = results.reduce(
      (sum, batch) =>
        sum + (batch.successCount || 0) + (batch.failureCount || 0),
      0
    );
    const totalDelivered = results.reduce(
      (sum, batch) => sum + (batch.successCount || 0),
      0
    );
    const totalFailed = results.reduce(
      (sum, batch) => sum + (batch.failureCount || 0),
      0
    );

    return {
      summary: results,
      totalBatches: tokenChunks.length,
      totalTokens: tokens.length,
      deliveryStats: {
        sent: totalSent,
        delivered: totalDelivered,
        failed: totalFailed,
      },
    };
  }

  static async getNotifications() {}
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
