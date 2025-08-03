import {envPath} from "../../../utils/global-utils.js";
import dotenv from 'dotenv';
dotenv.config({ path: envPath()});
import express from 'express';
import "./db.js"

const app = express();
import {register,collectDefaultMetrics} from "prom-client";
import vehicleRoutes from "./routes.js";
import {VehicleListingServiceError} from "./utils/myutils.js";
collectDefaultMetrics({register:register});

const PORT = process.env.VEHICLE_LISTING_SERVICE_PORT || 7;

app.use(express.json());
app.use(vehicleRoutes);

app.get('/', (req, res) => {
    return res.json('Hello World Vehicle Listing Service');
});
app.get('/metrics',async (req, res) => {
    res.setHeader('Content-Type',register.contentType);
    const metrics=await register.metrics();
    res.send(metrics);
});


app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.status || 500;
    const message = (err instanceof VehicleListingServiceError) ?err.message: 'Internal Server Error';

    res.status(statusCode).json({
        status: false,
        message
    });
});


app.listen(PORT, () => {
    console.log(`Vehicle Listing Service running on http://localhost:${PORT}`);
});