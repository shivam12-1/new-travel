import mongoose from 'mongoose';
import {VehicleTypes} from "../utils/myutils.js";

const DriversSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    uuid:String,
    documents: {
        drivingLicenceNumber: {
            type: String,
            required: true,
            unique: true
        },
        drivingLicencePhoto: {
            type: String,
            required: true
        },
        aadharCardNumber: {
            type: String,
            required: true,
            unique: true
        },
        aadharCardPhoto: {
            type: String,
            required: true
        },
        aadharCardPhotoBack: {
            type: String,
            required: true
        },
        panCardNumber: {
            type: String,
            default: "",
            required: false,
        },
        panCardPhoto: {
            type: String,
            default: "",
            required: false
        },
    },
    vehicleType: {
        type: [String],
        enum: VehicleTypes,
        required: true
    },
    servicesCities: {
        type: [String],
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    planExpiredDate: { type: Date, default: null },
    mobileNumber: {
        type: String,
        required: true,
        match: /^[6-9]\d{9}$/,
        unique: true
    },
    profilePhoto: {
        type: String,
        required: true
    },
    languageSpoken: {
        type: [String],
        required: true
    },
    bio: {
        type: String,
        maxlength: 300
    },
    experience: {
        type: Number,
        min: 0,
        required: true
    },
    address: {
        addressLine:{type:String,required:true},
        city:{type:String,required:true},
        state: {type:String,required:true},
        pincode: {type:Number,required:true},
        country: {type:String,default:'India'},
    },
    minimumCharges: {
        type: Number,
        required: true,
        min: 0
    },
    dob: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    rating:{type:Number,default:4.0},
    totalRating:{type:Number,default:0},
    totalRatingSum:{type:Number,default:0},
    isVerifiedByAdmin: {
        type: Boolean,
        default: false
    },
    isBlockedByAdmin: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

const DriversModel = mongoose.model('Driver', DriversSchema);

export default DriversModel;
