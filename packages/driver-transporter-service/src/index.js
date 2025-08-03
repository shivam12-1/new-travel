import {envPath} from "../../../utils/global-utils.js";
import dotenv from 'dotenv';
dotenv.config({ path: envPath()});
import express from 'express';
import "./db.js"
import driverTransporterRoute from "./routes.js";
import {register,collectDefaultMetrics} from "prom-client";
import {DriverTransPorterServiceError} from "./utils/myutils.js";
collectDefaultMetrics({register:register});

const app = express();

const PORT = process.env.DRIVER_TRANSPORTER_SERVICE_PORT || 2;

app.use(express.json());
app.use(driverTransporterRoute);

app.get('/', (req, res) => {
    return res.json('Hello World Driver And Transporter Service');
});

app.get('/metrics',async (req, res) => {
    res.setHeader('Content-Type',register.contentType);
    const metrics=await register.metrics();
    res.send(metrics);
});


app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.status || 500;
    const message = (err instanceof DriverTransPorterServiceError ) ?err.message: 'Internal Server Error';

    res.status(statusCode).json({
        status: false,
        message,
        ...(err.data && {data: err.data})
    });
});

app.listen(PORT, () => {
    console.log(`Driver And Transporter Service running on http://localhost:${PORT}`);
});