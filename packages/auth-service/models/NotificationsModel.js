import mongoose from 'mongoose';

const NotificationsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxLength: 500
    },
    image: {
        type: String,
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    },
    kind: {
        type: String,
        enum: ['admin', 'system', 'chat', 'promotion', 'alert'],
        default: 'admin'
    },
    targetAudience: {
        type: String,
        enum: ['ALL', 'USERS', 'DRIVERS', 'TRANSPORTERS', 'INDEPENDENT_CAR_OWNER', 'RICKSHAW', 'E_RICKSHAW'],
        default: 'ALL'
    },
    recipientType: {
        type: String,
        enum: ['ALL_USERS', 'SELECTED_USERS'],
        default: 'ALL_USERS'
    },
    selectedUserIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    recipientCount: {
        type: Number,
        default: 0
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    sendType: {
        type: String,
        enum: ['push', 'email', 'both'],
        default: 'push'
    },
    deliveryStatus: {
        sent: { type: Number, default: 0 },
        delivered: { type: Number, default: 0 },
        failed: { type: Number, default: 0 }
    },
    templateUsed: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NotificationTemplate',
        default: null
    },
    messageType: {
        type: String,
        enum: ['CUSTOM', 'TEMPLATE'],
        default: 'CUSTOM'
    }
}, { timestamps: true });

NotificationsSchema.index({ userId: 1 });
NotificationsSchema.index({ targetAudience: 1 });
NotificationsSchema.index({ sentAt: -1 });

const NotificationsModel = mongoose.model('Notification', NotificationsSchema);

export default NotificationsModel;