import mongoose from 'mongoose'

const notificationTemplate = mongoose.Schema({
    message:String,
    name:String,
},{timestamps:true});

const NotificationTemplateModel=mongoose.model('NotificationTemplate',notificationTemplate);

export default NotificationTemplateModel;