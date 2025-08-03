import mongoose from 'mongoose';

const ContainerSchema = new mongoose.Schema({
        image: String,
        containerFor: {type:String,enum:['Advertisement','Banner']},
    },
    {timestamps: true}
);


const ContainerModel = mongoose.model('Container', ContainerSchema);

export default ContainerModel;