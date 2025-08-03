import mongoose from "mongoose";
import { ServiceTypes } from "../utils/index.js";

const SubscriptionsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: function() {
        return this.subscriptionType !== "REGISTRATION_ONLY";
      },
    },
    plan: { type: mongoose.Schema.Types.Mixed },

    // Registration fee details (if applicable)
    registrationFeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegistrationFee",
    },
    registrationFee: { type: mongoose.Schema.Types.Mixed },

    // Subscription type and category
    subscriptionType: {
      type: String,
      enum: [
        "SUBSCRIPTION_ONLY",
        "REGISTRATION_ONLY",
        "REGISTRATION_WITH_SUBSCRIPTION",
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ServiceTypes,
      required: true,
    },

    status: {
      type: String,
      enum: ["created", "active", "failed", "cancelled", "expired"],
      default: "created",
    },
    startDate: Date,
    endDate: Date, // expiry date

    // Razorpay-related
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: String,
    paymentSignature: String,

    // Amount breakdown
    subscriptionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    registrationAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },

    // Coupons & Discounts
    couponCode: String,
    couponDiscountAmount: {
      type: Number,
      default: 0,
    },

    // Early bird discount tracking
    earlyBirdDiscountApplied: {
      type: Boolean,
      default: true,
    },
    subscriptionDiscountAmount: {
      type: Number,
      default: 0,
    },
    registrationDiscountAmount: {
      type: Number,
      default: 0,
    },

    paymentStoreTimestamp: Date,
    description: String,

    // For registration fee payment tracking
    hasRegistrationFee: {
      type: Boolean,
      default: false,
    },
    registrationFeePaid: {
      type: Boolean,
      default: false,
    },
    registrationFeePaidAt: Date,
  },
  {
    timestamps: true,
  }
);

const SubscriptionsModel = mongoose.model("Subscription", SubscriptionsSchema);

export default SubscriptionsModel;
