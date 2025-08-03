import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {envPath} from "../../../../utils/global-utils.js";
dotenv.config({path:envPath()});
const db_url=process.env.MONGO_DB_URL
mongoose.connect(db_url,{}).then(() => console.log('USER_SERVICE-DB connected')).catch(e => console.log(`Error Connecting TO DB ${e}`));