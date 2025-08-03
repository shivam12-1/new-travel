// models/Support.js
import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema({
    id: Number,
    type: String,
    email: String,
    description: String,
    color: String
});

const contactSchema = new mongoose.Schema({
    phone: String,
    phoneTitle: String,
    phoneDesc: String,
    addressTitle: String,
    addressLine1: String,
    addressLine2: String
});

const supportSchema = new mongoose.Schema({
    emails: [emailSchema],
    contact: contactSchema
}, { timestamps: true });

const SupportModel=mongoose.models.Support || mongoose.model('Support', supportSchema);

export default SupportModel;
