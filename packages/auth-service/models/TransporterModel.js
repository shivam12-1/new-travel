import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema({
    addressLine: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: Number, required: true }
}, { _id: false });

const CountsSchema = new mongoose.Schema({
    car: { type: Number, default: 0 },
    bus: { type: Number, default: 0 },
    van: { type: Number, default: 0 }
}, { _id: false });

const PointsSchema = new mongoose.Schema({
    use_login_number: { type: Boolean, default: true },
    show_number_on_app_website: { type: Boolean, default: true },
    enable_chat: { type: Boolean, default: true }
}, { _id: false });

const TransporterSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    uuid: String,
    companyName: { type: String, default: "" },
    phoneNumber: { type: String, required: true, unique: true }, // <-- added
    address: { type: AddressSchema, required: true },
    addressType: { type: String, enum: ['Home', 'Office','Work','Other'], default: 'Home' },
    fleetSize: { type: String, default: "" },
    counts: { type: CountsSchema, default: () => ({}) },
    contactPersonName: { type: String, default: "" },
    points: { type: PointsSchema, default: () => ({})},
    bio: { type: String, default: "" },
    photo: { type: String, default: "" },
    planExpiredDate: { type: Date, default: null },
    documents:{
        gstin: { type: String, default: "" },
        aadharCardNumber: { type: String, default: "" },
        aadharCardPhoto: { type: String, default: "" },
        aadharCardPhotoBack: { type: String, default: "" },
        panCardNumber: { type: String, default: "" },
        panCardPhoto: { type: String, default: "" },
        business_registration_certificate: { type: String, default: "" },
        transportationPermit: { type: String, default: "" },
    },
    rating:{type: Number,default:4.0},
    totalRating:{type: Number,default:0},
    totalRatingSum:{type: Number,default:0},
    isVerifiedByAdmin: { type: Boolean, default: false },
    isBlockedByAdmin: { type: Boolean, default: false },
}, { timestamps: true });

const TransporterModel = mongoose.model('Transporter', TransporterSchema);

export default TransporterModel;
