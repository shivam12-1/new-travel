import mongoose from "mongoose";
import ChatModel from "../models/ChatModel.js";
import DriversModel from "../models/DriversModel.js";
import VehicleModel from "../models/VehiclesModel.js";
import TransporterModel from "../models/TransporterModel.js";
import UserModel from "../models/UserModel.js";
import { ChatServiceError } from "./utils/myutils.js";
import { translateText } from "../utils/translation.js";

// Active clients structure: chatId -> Map(userId -> {ws, lastSeen, isTyping})
const activeClients = new Map();

export class ChatService {
  static async getMyChatList(req, res) {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        throw new ChatServiceError("User ID is required", 400);
      }

      const chats = await ChatModel.find({
        $or: [{ userId }, { to: userId }],
        deletedFor: { $ne: userId },
      })
        .sort({ updatedAt: -1 })
        .lean()
        .exec();

      const chatList = await Promise.all(
        chats.map(async (chat) => {
          const { userId: senderId, to: receiverId, cause } = chat;
          const otherParticipantId =
            userId === String(senderId) ? receiverId : senderId;

          const personInfo = await ChatService.getParticipantInfo(
            cause,
            senderId.toString() !== userId,
            otherParticipantId
          );

          const lastMessage =
            chat.messages.length > 0
              ? chat.messages[chat.messages.length - 1]
              : null;
          const lastMessageDateTime = lastMessage
            ? lastMessage.at
            : chat.updatedAt;

          // Get unread message count
          const unreadCount = chat.messages.filter(
            (msg) =>
              msg.senderId.toString() !== userId &&
              !msg.readBy.some((id) => id.toString() === userId)
          ).length;

          // Check if other participant is online
          const isOnline = ChatService.isUserOnlineInChat(
            otherParticipantId,
            chat._id.toString()
          );
          const lastSeen = ChatService.getUserLastSeen(
            otherParticipantId,
            chat._id.toString()
          );

          return {
            chatId: chat._id,
            name: personInfo.name,
            image: personInfo.image,
            userId: personInfo.personUserId,
            id: personInfo.personId,
            timestamp: lastMessageDateTime,
            cause: cause,
            unreadCount: unreadCount,
            isOnline: isOnline,
            lastSeen: lastSeen,
            isTyping: ChatService.isUserTyping(
              otherParticipantId,
              chat._id.toString()
            ),
          };
        })
      );

      return res.json({
        status: true,
        message: "All Chat List",
        data: chatList,
      });
    } catch (error) {
      console.error("Error in getMyChatList:", error);
      if (error instanceof ChatServiceError) {
        return res.status(error.statusCode).json({
          status: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        status: false,
        message: "Internal server error",
      });
    }
  }

  static async createChat(req, res) {
    try {
      const userId = req.headers["x-user-id"];
      const { cause, id } = req.body;

      if (!userId || !cause || !id) {
        throw new ChatServiceError("Missing required fields", 400);
      }

      if (userId === id) {
        throw new ChatServiceError("You cannot chat with yourself", 400);
      }

      let chat = await ChatModel.findOne({
        $or: [
          { userId, to: id, cause },
          { userId: id, to: userId, cause },
        ],
        deletedFor: { $ne: userId },
      });

      if (!chat) {
        chat = new ChatModel({
          userId,
          to: id,
          cause,
          messages: [],
        });
        await chat.save();
      }

      const isCurrentUserSender = userId === String(chat.userId);
      const otherParticipantId = isCurrentUserSender ? chat.to : chat.userId;

      const personInfo = await ChatService.getParticipantInfo(
        cause,
        false,
        otherParticipantId
      );

      return res.json({
        status: true,
        message: "Chat Created",
        data: {
          chatId: chat._id,
          name: personInfo.name,
          image: personInfo.image,
          number: personInfo.number,
          otherPersonId: personInfo.personId,
          otherPersonUserId: personInfo.personUserId,
        },
      });
    } catch (error) {
      console.error("Error in createChat:", error);
      if (error instanceof ChatServiceError) {
        return res.status(error.statusCode).json({
          status: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        status: false,
        message: "Internal server error",
      });
    }
  }

  static async getChatMessages(req, res) {
    try {
      const userId = req.headers["x-user-id"];
      const { conversationsId } = req.params;

      if (!userId || !conversationsId) {
        throw new ChatServiceError("Missing required fields", 400);
      }

      const chat = await ChatModel.findOne({ _id: conversationsId })
        .lean()
        .exec();
      if (!chat) {
        throw new ChatServiceError("Chat not found", 404);
      }

      const messages = chat.messages.map((e) => ({
        isSent: userId === e.senderId.toString(),
        message: e.message,
        messageId: e._id,
        messageType: e.messageType,
        at: e.at,
        deliveryStatus: e.deliveryStatus,
        isRead: e.readBy.some((id) => id.toString() === userId),
        readBy: e.readBy,
        deliveredTo: e.deliveredTo,
      }));

      // Mark messages as read
      await ChatModel.updateOne(
        { _id: conversationsId },
        {
          $addToSet: {
            "messages.$[elem].readBy": new mongoose.Types.ObjectId(userId),
          },
          $set: {
            "messages.$[elem].deliveryStatus": "read",
          },
        },
        {
          arrayFilters: [
            {
              "elem.senderId": { $ne: new mongoose.Types.ObjectId(userId) },
              "elem.readBy": { $ne: new mongoose.Types.ObjectId(userId) },
            },
          ],
          multi: true,
        }
      );

      return res.json({
        status: true,
        message: "Chat Messages",
        data: messages,
      });
    } catch (error) {
      console.error("Error in getChatMessages:", error);
      if (error instanceof ChatServiceError) {
        return res.status(error.statusCode).json({
          status: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        status: false,
        message: "Internal server error",
      });
    }
  }

  static async deleteChat(req, res) {
    try {
      const userId = req.headers["x-user-id"];
      const { conversationsId } = req.params;

      if (!userId || !conversationsId) {
        throw new ChatServiceError("Missing required fields", 400);
      }

      const result = await ChatModel.updateOne(
        { _id: conversationsId, deletedFor: { $ne: userId } },
        { $addToSet: { deletedFor: userId } }
      );

      if (result.modifiedCount === 0) {
        throw new ChatServiceError(
          "Chat already deleted for this user or not found.",
          400
        );
      }

      return res
        .status(200)
        .json({ status: true, message: "Chat deleted successfully." });
    } catch (error) {
      console.error("Error in deleteChat:", error);
      if (error instanceof ChatServiceError) {
        return res.status(error.statusCode).json({
          status: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        status: false,
        message: "Internal server error",
      });
    }
  }

  static async getParticipantInfo(cause, isUser, userId) {
    let person,
      name = "",
      image = "",
      number = "",
      personId = userId,
      personUserId = userId;

    try {
      if (isUser) {
        person = await UserModel.findById(userId).lean();
        if (person) {
          name = `${person.firstName} ${person.lastName}`;
          image = person.image || "";
          number = person.mobileNumber || "";
        }
      } else {
        switch (cause) {
          case "DRIVER":
            person = await DriversModel.findOne({ userId }).lean();
            if (person) {
              name = person.fullName || "";
              image = person.profilePhoto || "";
              number = person.mobileNumber || "";
              personId = person._id;
            }
            break;
          case "RICKSHAW":
          case "E_RICKSHAW":
            person = await VehicleModel.findOne({ userId }).lean();
            if (person) {
              name = person.details?.fullName || "";
              image = person.details?.profilePhoto || "";
              number = person.details?.mobileNumber || "";
              personId = person._id;
            }
            break;
          case "TRANSPORTER":
            person = await TransporterModel.findOne({ userId }).lean();
            if (person) {
              name = person.companyName || "";
              image = person.photo || "";
              number = person.mobileNumber || "";
              personId = person._id;
            }
            break;
        }
      }
    } catch (error) {
      console.error("Error getting participant info:", error);
    }

    return { name, image, number, personId, personUserId };
  }

  static async startRealTimeChat(ws, req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId");
    const chatId = url.searchParams.get("chatId");
    const userRole = url.searchParams.get("userRole");

    if (!userId || !chatId) {
      ws.close(1008, "Missing userId or chatId");
      return;
    }

    console.log(`New WebSocket connection: userId=${userId}, chatId=${chatId}`);

    // Initialize chat if not exists
    if (!activeClients.has(chatId)) {
      activeClients.set(chatId, new Map());
    }

    // Add user to chat
    activeClients.get(chatId).set(userId, {
      ws: ws,
      lastSeen: new Date().toISOString(),
      isTyping: false,
      typingTimeout: null,
    });

    // Notify other participants that user is online
    ChatService.broadcastToChat(
      chatId,
      {
        type: "user_online",
        userId: userId,
        timestamp: Date.now(),
      },
      userId
    );

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg);
        console.log("Received message:", data);

        // Update last seen on any message
        ChatService.updateLastSeen(userId, chatId);

        switch (data.type) {
          case "message":
            await ChatService.handleMessage(ws, userId, chatId, data);
            break;
          case "typing_start":
            await ChatService.handleTypingStart(userId, chatId);
            break;
          case "typing_stop":
            await ChatService.handleTypingStop(userId, chatId);
            break;
          case "message_read":
            await ChatService.handleMessageRead(userId, chatId, data.messageId);
            break;
          case "translate_message":
            await ChatService.handleTranslateMessage(ws, userId, chatId, data);
            break;
          case "heartbeat":
            ws.send(
              JSON.stringify({
                type: "heartbeat_ack",
                timestamp: Date.now(),
              })
            );
            break;
          default:
            console.log("Unknown message type:", data.type);
        }
      } catch (err) {
        console.error("Message processing error:", err);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Failed to process message",
            error: err.message,
            timestamp: Date.now(),
          })
        );
      }
    });

    ws.on("error", (error) => {
      console.error(
        `WebSocket error for user ${userId} in chat ${chatId}:`,
        error
      );
      ChatService.handleUserDisconnect(userId, chatId);
    });

    ws.on("close", (code, reason) => {
      console.log(
        `Connection closed for user ${userId} in chat ${chatId}. Code: ${code}, Reason: ${reason}`
      );
      ChatService.handleUserDisconnect(userId, chatId);
    });

    // Send initial connection confirmation
    ws.send(
      JSON.stringify({
        type: "connection_established",
        timestamp: Date.now(),
      })
    );
  }

  static async handleMessage(ws, userId, chatId, data) {
    const { message: sendMessage, recipientId, messageType } = data;

    if (!sendMessage || !recipientId || !messageType) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Message Blocked By Server - Missing required fields",
          timestamp: Date.now(),
        })
      );
      return;
    }

    const messageData = {
      senderId: new mongoose.Types.ObjectId(userId),
      messageType: messageType,
      message: sendMessage,
      at: new Date().toISOString(),
      deliveryStatus: "sent",
      readBy: [],
      deliveredTo: [],
    };

    try {
      // Save to DB
      const savedMessage = await ChatService.saveChatToDb(chatId, messageData);

      // Send confirmation to sender
      ws.send(
        JSON.stringify({
          type: "message_sent",
          messageId: savedMessage._id.toString(),
          isSent: true,
          message: sendMessage,
          messageType: messageType,
          at: savedMessage.at,
          deliveryStatus: "sent",
          timestamp: Date.now(),
        })
      );

      // Check if recipient is online in this chat
      const recipientOnline = ChatService.isUserOnlineInChat(
        recipientId,
        chatId
      );
      const recipientClient = recipientOnline
        ? activeClients.get(chatId)?.get(recipientId)
        : null;

      if (
        recipientClient &&
        recipientClient.ws.readyState === recipientClient.ws.OPEN
      ) {
        // Send message to recipient
        recipientClient.ws.send(
          JSON.stringify({
            type: "message_received",
            messageId: savedMessage._id.toString(),
            isSent: false,
            message: sendMessage,
            messageType: messageType,
            at: savedMessage.at,
            senderId: userId,
            timestamp: Date.now(),
          })
        );

        // Update delivery status
        await ChatService.updateMessageDeliveryStatus(
          chatId,
          savedMessage._id.toString(),
          recipientId,
          "delivered"
        );

        // Send delivery confirmation to sender
        ws.send(
          JSON.stringify({
            type: "message_delivered",
            messageId: savedMessage._id.toString(),
            deliveredTo: recipientId,
            timestamp: Date.now(),
          })
        );
      } else {
        console.log("Recipient is offline, sending push notification");
        await sendPushNotification(
          recipientId,
          chatId,
          messageType,
          sendMessage
        );
      }
    } catch (dbError) {
      console.error("Database save error:", dbError);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to save message",
          timestamp: Date.now(),
        })
      );
    }
  }

  static async handleTypingStart(userId, chatId) {
    const chatClients = activeClients.get(chatId);
    if (!chatClients || !chatClients.has(userId)) return;

    const userClient = chatClients.get(userId);
    userClient.isTyping = true;

    // Clear existing timeout
    if (userClient.typingTimeout) {
      clearTimeout(userClient.typingTimeout);
    }

    // Auto-stop typing after 10 seconds
    userClient.typingTimeout = setTimeout(() => {
      ChatService.handleTypingStop(userId, chatId);
    }, 10000);

    // Broadcast typing status to other participants
    ChatService.broadcastToChat(
      chatId,
      {
        type: "user_typing_start",
        userId: userId,
        timestamp: Date.now(),
      },
      userId
    );
  }

  static async handleTypingStop(userId, chatId) {
    const chatClients = activeClients.get(chatId);
    if (!chatClients || !chatClients.has(userId)) return;

    const userClient = chatClients.get(userId);
    userClient.isTyping = false;

    if (userClient.typingTimeout) {
      clearTimeout(userClient.typingTimeout);
      userClient.typingTimeout = null;
    }

    // Broadcast typing stop to other participants
    ChatService.broadcastToChat(
      chatId,
      {
        type: "user_typing_stop",
        userId: userId,
        timestamp: Date.now(),
      },
      userId
    );
  }

  static async handleMessageRead(userId, chatId, messageId) {
    try {
      // Update message as read in database
      await ChatModel.updateOne(
        {
          _id: chatId,
          "messages._id": new mongoose.Types.ObjectId(messageId),
        },
        {
          $addToSet: {
            "messages.$.readBy": new mongoose.Types.ObjectId(userId),
          },
          $set: {
            "messages.$.deliveryStatus": "read",
          },
        }
      );

      // Notify sender about read receipt
      const chat = await ChatModel.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message || message.senderId.toString() === userId) return;

      const senderClient = ChatService.getUserInChat(
        message.senderId.toString(),
        chatId
      );
      if (senderClient) {
        senderClient.ws.send(
          JSON.stringify({
            type: "message_read",
            messageId: messageId,
            readBy: userId,
            timestamp: Date.now(),
          })
        );
      }
    } catch (error) {
      console.error("Error handling message read:", error);
    }
  }

  static updateLastSeen(userId, chatId) {
    const chatClients = activeClients.get(chatId);
    if (chatClients && chatClients.has(userId)) {
      chatClients.get(userId).lastSeen = new Date().toISOString();
    }
  }

  static handleUserDisconnect(userId, chatId) {
    const chatClients = activeClients.get(chatId);
    if (!chatClients) return;

    // Stop typing if user was typing
    if (chatClients.has(userId)) {
      const userClient = chatClients.get(userId);
      if (userClient.typingTimeout) {
        clearTimeout(userClient.typingTimeout);
      }
      if (userClient.isTyping) {
        ChatService.handleTypingStop(userId, chatId);
      }
    }

    chatClients.delete(userId);

    // Clean up empty chat maps
    if (chatClients.size === 0) {
      activeClients.delete(chatId);
    } else {
      // Notify other participants that user went offline
      ChatService.broadcastToChat(
        chatId,
        {
          type: "user_offline",
          userId: userId,
          timestamp: Date.now(),
        },
        userId
      );
    }
  }

  static broadcastToChat(chatId, message, excludeUserId = null) {
    const chatClients = activeClients.get(chatId);
    if (!chatClients) return;

    chatClients.forEach((client, userId) => {
      if (userId !== excludeUserId && client.ws.readyState === client.ws.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Error sending message to user ${userId}:`, error);
        }
      }
    });
  }

  static isUserOnlineInChat(userId, chatId) {
    const chatClients = activeClients.get(chatId);
    if (!chatClients) return false;

    const userClient = chatClients.get(userId);
    return userClient && userClient.ws.readyState === userClient.ws.OPEN;
  }

  static isUserTyping(userId, chatId) {
    const chatClients = activeClients.get(chatId);
    if (!chatClients) return false;

    const userClient = chatClients.get(userId);
    return userClient ? userClient.isTyping : false;
  }

  static getUserLastSeen(userId, chatId) {
    const chatClients = activeClients.get(chatId);
    if (!chatClients) return null;

    const userClient = chatClients.get(userId);
    return userClient ? userClient.lastSeen : null;
  }

  static getUserInChat(userId, chatId) {
    const chatClients = activeClients.get(chatId);
    return chatClients ? chatClients.get(userId) : null;
  }

  static async updateMessageDeliveryStatus(chatId, messageId, userId, status) {
    try {
      const updateQuery = {
        $set: { "messages.$.deliveryStatus": status },
      };

      if (status === "delivered") {
        updateQuery.$addToSet = {
          "messages.$.deliveredTo": new mongoose.Types.ObjectId(userId),
        };
      }

      await ChatModel.updateOne(
        {
          _id: chatId,
          "messages._id": new mongoose.Types.ObjectId(messageId),
        },
        updateQuery
      );
    } catch (error) {
      console.error("Error updating delivery status:", error);
    }
  }

  static async translateMessageREST(req, res) {
    try {
      const userId = req.headers["x-user-id"];
      const { chatId, messageId, targetLanguage } = req.body;

      if (!userId || !chatId || !messageId || !targetLanguage) {
        throw new ChatServiceError("Missing required fields", 400);
      }

      const chat = await ChatModel.findById(chatId);
      if (!chat) {
        throw new ChatServiceError("Chat not found", 404);
      }

      const message = chat.messages.id(messageId);
      if (!message) {
        throw new ChatServiceError("Message not found", 404);
      }

      const projectId = process.env.GOOGLE_PROJECT_ID;
      if (!projectId) {
        throw new ChatServiceError("Translation service not configured", 500);
      }

      const translatedText = await translateText(
        message.message,
        targetLanguage,
        projectId
      );

      return res.json({
        status: true,
        message: "Message translated successfully",
        data: {
          messageId: messageId,
          originalText: message.message,
          translatedText: translatedText,
          targetLanguage: targetLanguage,
        },
      });
    } catch (error) {
      console.error("Error in translateMessage:", error);
      if (error instanceof ChatServiceError) {
        return res.status(error.statusCode).json({
          status: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        status: false,
        message: "Internal server error",
      });
    }
  }

  static async handleTranslateMessage(ws, userId, chatId, data) {
    const { messageId, targetLanguage } = data;

    if (!messageId || !targetLanguage) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Missing messageId or targetLanguage",
          timestamp: Date.now(),
        })
      );
      return;
    }

    try {
      const chat = await ChatModel.findById(chatId);
      if (!chat) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Chat not found",
            timestamp: Date.now(),
          })
        );
        return;
      }

      const message = chat.messages.id(messageId);
      if (!message) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Message not found",
            timestamp: Date.now(),
          })
        );
        return;
      }

      const projectId = process.env.GOOGLE_PROJECT_ID;
      if (!projectId) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Translation service not configured",
            timestamp: Date.now(),
          })
        );
        return;
      }

      const translatedText = await translateText(
        message.message,
        targetLanguage,
        projectId
      );

      ws.send(
        JSON.stringify({
          type: "message_translated",
          messageId: messageId,
          originalText: message.message,
          translatedText: translatedText,
          targetLanguage: targetLanguage,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Translation error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Translation failed",
          error: error.message,
          timestamp: Date.now(),
        })
      );
    }
  }

  static async saveChatToDb(chatId, messageData) {
    const chat = await ChatModel.findOneAndUpdate(
      { _id: chatId },
      {
        $push: { messages: messageData },
        $set: { updatedAt: new Date().toISOString() },
      },
      { new: true }
    ).exec();

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Return the last message (which is the one we just added)
    return chat.messages[chat.messages.length - 1];
  }
}

async function sendPushNotification(
  recipientId,
  chatId,
  messageType,
  sendMessage
) {
  const url = `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.NOTIFICATION_SERVICE_PORT || 3003}/send-push-endpoint`;
  const token = "INTER_SERVICE_COMMUNICATION";

  const payload = {
    message: sendMessage,
    messageType,
    chatId,
    id: recipientId,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Notification sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw error;
  }
}
