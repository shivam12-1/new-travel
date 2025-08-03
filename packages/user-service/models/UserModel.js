import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    uuid: String,
    firstName:{type:String,default:""},
    lastName:{type:String,default:""},
    image:{type:String,default:"https://s3.ap-south-1.amazonaws.com/media.ridewithdriver/user/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg"},
    mobileNumber: { type: String, required: true, unique: true },
    otp: String,
    isVerified: Boolean,
    email: {type:String,default:""},
    password: String,
    role: String,
    isBlockedByAdmin: {type:Boolean,default:false},
    isRegisteredAsDriver:{type:Boolean,default:false},
    isRegisteredAsTransporter:{type:Boolean,default:false},
    isRegisteredAsIndependentCarOwner:{type:Boolean,default:false},
    isRegisterAsERickshaw: {type:Boolean,default:false},
    isRegisterAsRickshaw: {type:Boolean,default:false},
    message:String,
    language:String,
    fcmToken:{type:String,default:""},
    preferencesWhatsapp: { type: Boolean, default: true },
    preferencesPhone: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
},{ timestamps: true});

const UserModel = mongoose.model('User', UserSchema);

export default UserModel;