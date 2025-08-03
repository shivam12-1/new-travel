import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    permissions: [String],
    password: String,
    status: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active'
    },
    deleted: {
        type: Boolean,
        default: false
    }
},{timestamps:true});

const AdminModel =mongoose.model('Admin', adminSchema);

export default AdminModel;