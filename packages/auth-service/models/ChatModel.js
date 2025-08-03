import mongoose from 'mongoose';
import {ChatTypes} from "chat-service/src/utils/myutils.js";
import {ServiceTypes} from "../utils/index.js";


const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    to: { type: mongoose.Schema.Types.ObjectId, required: true },
    cause: { type: String, enum: ServiceTypes, required: true },
    messages: [
        {
            senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
            messageType: { type: String, enum: ChatTypes, required: true },
            message: { type: String, required: true },
            at: { type: Date, default: () => new Date().toISOString() },
            deliveryStatus: {
                type: String,
                enum: ['sent', 'delivered', 'read'],
                default: 'sent'
            },
            readBy: [{
                type: mongoose.Schema.Types.ObjectId,
                default: []
            }],
            deliveredTo: [{
                type: mongoose.Schema.Types.ObjectId,
                default: []
            }]
        }
    ],
    deletedFor: {
        type: [String],
        default: [],
    }
}, { timestamps: true });

// Add indexes for better performance
chatSchema.index({ userId: 1 });
chatSchema.index({ to: 1 });
chatSchema.index({ cause: 1 });
chatSchema.index({ updatedAt: -1 });

const ChatModel = mongoose.model('Chat', chatSchema);
export default ChatModel;