import mongoose from 'mongoose';
import {AirConditioningTypes, FuelTypes, VehicleTypes} from "../utils/myutils.js";

const VehicleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    uuid: String,
    vehicleOwnership:{type:String,required:true},
    vehicleName: { type: String, required: true },
    vehicleModelName: { type: String, required: true },
    manufacturing: { type: String, required: true },
    maxPower: { type: String },
    maxSpeed: { type: String },
    fuelType: {
        type: String,
        enum: FuelTypes,
        required: true
    },
    first2Km:{type:Number,default:0},
    milage: { type: String },
    registrationDate: { type: String },
    airConditioning: {
        type: String,
        enum: AirConditioningTypes,
        required: true
    },
    vehicleType: {
        type: String,
        enum: VehicleTypes,
        required: true
    },
    seatingCapacity: {
        type: Number,
        min: 1,
        max: 10,
        required: true
    },
    vehicleNumber: { type: String },
    vehicleSpecifications: [String],
    servedLocation: [String],
    minimumChargePerHour: { type: Number },
    currency: { type: String, default: 'INR'},
    images: [{ type: String }],
    videos: [{ type: String }],
    isPriceNegotiable: { type: Boolean, default: false },
    documents:{
        rcBookFrontPhoto:String,
        rcBookBackPhoto:String,
        driverLicensePhoto:String,
        driverLicenseNumber:String,
        aadharCardPhoto:String,
        aadharCardPhotoBack:String,
        aadharCardNumber:String,
        panCardPhoto:String,
        panCardNumber:String,
    },
    details:{
        fullName: {
            type: String,
            default: null
        },
        mobileNumber: {
            type: String,
            default: null,
            match: /^[6-9]\d{9}$/
        },
        profilePhoto: {
            type: String,
            default: null
        },
        languageSpoken: {
            type: [String],
            default: null
        },
        bio: {
            type: String,
            maxlength: 300,
            default: null
        },
        experience: {
            type: Number,
            min: 0,
            default:null
        },
        address: {
            addressLine:{type:String,default:null},
            city:{type:String,default:null},
            state: {type:String,default:null},
            pincode: {type:Number,default:null},
            country: {type:String,default:'India'},
        },
        planExpiredDate: { type: Date, default: null },
        rating:{type: Number,default:4.0},
        totalRating:{type: Number,default:0},
        totalRatingSum:{type: Number,default:0},
    },
    isVerifiedByAdmin: { type: Boolean, default: false },
    isBlockedByAdmin: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
}, { timestamps: true });


VehicleSchema.index(
    { 'details.mobileNumber': 1 },
    { unique: true, partialFilterExpression: { mobileNumber: { $type: 'string' } } }
);

const VehicleModel = mongoose.model('Vehicle', VehicleSchema);

export default VehicleModel;