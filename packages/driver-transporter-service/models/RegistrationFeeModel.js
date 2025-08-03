import mongoose from "mongoose";
import {ServiceTypes} from "../utils/index.js";

const registrationFeeSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ServiceTypes,
        required: true
    },
    grossPrice: {
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
    finalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});

// Middleware to exclude deleted fees by default
registrationFeeSchema.pre(/^find/, function() {
    if (!this.getQuery().hasOwnProperty('isDeleted')) {
        this.where({ isDeleted: { $ne: true } });
    }
});

const RegistrationFeeModel = mongoose.model('RegistrationFee', registrationFeeSchema);

export default RegistrationFeeModel;