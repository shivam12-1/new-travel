import mongoose from 'mongoose';

const FleetSizeSchema = new mongoose.Schema({
    cars: { type: Number, default: 0, min: 0, max: 2 },
    minivans: { type: Number, default: 0, min: 0, max: 2 }
}, { _id: false });

const IndependentCarOwnerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    uuid: String,
    
    // Basic Information
    photo: { type: String, required: true },
    name: { type: String, required: true },
    phoneNumber: { 
        type: String, 
        required: true, 
        unique: true,
        match: /^[6-9]\d{9}$/
    },
    about: { 
        type: String, 
        default: "I am an independent car owner providing reliable transportation services.",
        maxlength: 300 
    },
    
    // Address Information
    address: {
        addressLine: { type: String, required: true },
        pincode: { type: Number, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, default: 'India' }
    },
    
    // Documents
    documents: {
        aadharCardNumber: {
            type: String,
            required: true,
            unique: true
        },
        aadharCardPhotoFront: {
            type: String,
            required: true
        },
        aadharCardPhotoBack: {
            type: String,
            required: true
        },
        drivingLicenseNumber: {
            type: String,
            required: true,
            unique: true
        },
        drivingLicensePhoto: {
            type: String,
            required: true
        },
        transportationPermitPhoto: {
            type: String,
            required: false,
            default: ""
        }
    },
    
    // Fleet Information
    fleetSize: {
        type: FleetSizeSchema,
        required: true,
        validate: {
            validator: function(fleetSize) {
                return (fleetSize.cars + fleetSize.minivans) <= 2 && (fleetSize.cars + fleetSize.minivans) > 0;
            },
            message: 'Total fleet size must be between 1 and 2 vehicles'
        }
    },
    
    // Verification Status
    documentVerificationStatus: {
        aadharVerified: { type: Boolean, default: false },
        drivingLicenseVerified: { type: Boolean, default: false },
        isVerifiedByAdmin: { type: Boolean, default: false }
    },
    
    // Account Status
    isBlockedByAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    
    // Plan Information
    planExpiredDate: { type: Date, default: null },
    
    // Rating System
    rating: { type: Number, default: 4.0 },
    totalRating: { type: Number, default: 0 },
    totalRatingSum: { type: Number, default: 0 }
    
}, { timestamps: true });

// Indexes for better performance
IndependentCarOwnerSchema.index({ userId: 1 });
IndependentCarOwnerSchema.index({ 'address.pincode': 1 });
IndependentCarOwnerSchema.index({ 'address.city': 1 });

const IndependentCarOwnerModel = mongoose.model('IndependentCarOwner', IndependentCarOwnerSchema);

export { IndependentCarOwnerModel };
export default IndependentCarOwnerModel;