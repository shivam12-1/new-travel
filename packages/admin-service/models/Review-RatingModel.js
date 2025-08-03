import mongoose from 'mongoose';
import {ServiceTypes} from "../utils/myutils.js";

const ReviewRatingSchema = new mongoose.Schema({
    userId:mongoose.Schema.Types.ObjectId,
    to:mongoose.Schema.Types.ObjectId,
    serviceType:{type:String,enum:ServiceTypes},
    review:String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    isDeleted:{type:Boolean,default:false},
},{ timestamps: true});

const ReviewRatingModel = mongoose.model('ReviewRating', ReviewRatingSchema);

export default ReviewRatingModel;