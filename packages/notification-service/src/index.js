import {envPath} from "../../../utils/global-utils.js";
import dotenv from 'dotenv';
dotenv.config({ path: envPath()});
import express from 'express';
const app = express();
import {register,collectDefaultMetrics} from "prom-client";
import notificationRoutes from "./routes.js";
import {NotificationServiceError} from "./utils/myutils.js";
import "./db.js"
collectDefaultMetrics({register:register});

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 4;

app.use(express.json());
app.use(notificationRoutes);

app.get('/', (req, res) => {
    return res.json('Hello World Notification Service');
});

app.get('/metrics',async (req, res) => {
    res.setHeader('Content-Type',register.contentType);
    const metrics=await register.metrics();
    res.send(metrics);
});


app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.status || 500;
    const message = (err instanceof NotificationServiceError) ?err.message: 'Internal Server Error';

    res.status(statusCode).json({
        status: false,
        message
    });
});

app.listen(PORT, () => {
    console.log(`Notification Service running on http://localhost:${PORT}`);
});