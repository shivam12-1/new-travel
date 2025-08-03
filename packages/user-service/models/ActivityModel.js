import mongoose from 'mongoose';
import {ActivityTypes} from "../utils/index.js";

const activitySchema = new mongoose.Schema({
    userId:mongoose.Schema.Types.ObjectId,
    to:mongoose.Schema.Types.ObjectId,
    activityFor:{type:String,required:true},
    activity:{type:String,enum:ActivityTypes},
},{ timestamps: true});

const ActivityModel = mongoose.model('Activity', activitySchema);
export default ActivityModel;