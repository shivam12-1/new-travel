import mongoose from 'mongoose';
import {ServiceTypes} from "../utils/index.js";

const plansSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    planFor: {
        type: String,
        enum: ServiceTypes,
        required: true
    },
    // Subscription pricing details
    subscriptionGrossPricePerMonth: {
        type: Number,
        required: true,
        min: 0
    },
    durationInMonths: {
        type: Number,
        required: true,
        min: 1,
        enum: [1, 3, 6, 12]
    },
    subscriptionGrossPriceTotal: {
        type: Number,
        required: true,
        min: 0
    },
    earlyBirdDiscountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    earlyBirdDiscountPrice: {
        type: Number,
        required: true,
        min: 0
    },
    subscriptionFinalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    // Legacy fields for backward compatibility
    mrp: {
        type: Number,
        default: function() { return this.subscriptionGrossPriceTotal; }
    },
    price: {
        type: Number,
        default: function() { return this.subscriptionFinalPrice; }
    },
    validity: {
        type: Number,
        default: function() { return this.durationInMonths; }
    },
    featureTitle: {
        type: String,
        default: function() { 
            return `${this.durationInMonths} Month${this.durationInMonths > 1 ? 's' : ''} Subscription Package with Early Bird`;
        }
    },
    features: {
        type: [String],
        default: ["Early Bird Discount Applied", "Full Platform Access", "Priority Support"]
    },
    maxVehicles: {
        type: Number,
        default: 0,
        min: 0
    },
    // Plan type to distinguish registration vs subscription
    planType: {
        type: String,
        enum: ['SUBSCRIPTION', 'REGISTRATION'],
        default: 'SUBSCRIPTION'
    },
    // Soft delete fields
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    // Add indexes for better query performance
    indexes: [
        { name: 1, isDeleted: 1 },
        { planFor: 1, isDeleted: 1, planType: 1 },
        { durationInMonths: 1, planFor: 1 },
        { createdAt: -1 }
    ]
});

// Middleware to exclude deleted plans by default
plansSchema.pre(/^find/, function() {
    // Only apply this filter if isDeleted is not explicitly queried
    if (!this.getQuery().hasOwnProperty('isDeleted')) {
        this.where({ isDeleted: { $ne: true } });
    }
});

const PlansModel = mongoose.model.plans || mongoose.model('Plan', plansSchema);

export default PlansModel;