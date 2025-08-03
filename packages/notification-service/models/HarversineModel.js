import mongoose from 'mongoose';

export const VALID_HAVERSINE_CATEGORIES = [
    'DRIVER',
    'TRANSPORTER', 
    'RICKSHAW',
    'E_RICKSHAW',
    'CAR',
    'SUV',
    'VAN',
    'MINIVAN',
    'BUS',
    'ALL_VEHICLES',
    'INDEPENDENT_CAR_OWNER'
];

const HaversineSchema = new mongoose.Schema({
    distance: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: VALID_HAVERSINE_CATEGORIES
    }
}, { timestamps: true });

const HaversineModel = mongoose.model('Haversine', HaversineSchema);

export default HaversineModel;