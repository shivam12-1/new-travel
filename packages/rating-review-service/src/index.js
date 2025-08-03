import {envPath} from "../../../utils/global-utils.js";
import dotenv from 'dotenv';
dotenv.config({ path: envPath()});
import express from 'express';
import "./db.js"
import ratingRouter from "./routes.js";

const app = express();
import {register,collectDefaultMetrics} from "prom-client";
import {RatingAndReviewServiceError} from "./utils/myutils.js";
collectDefaultMetrics({register:register});

const PORT = process.env.REVIEW_AND_RATING_SERVICE_PORT || 5;

app.use(express.json());
app.use(ratingRouter);

app.get('/', (req, res) => {
    return res.json('Hello World Rating And Review Service');
});

app.get('/metrics',async (req, res) => {
    res.setHeader('Content-Type',register.contentType);
    const metrics=await register.metrics();
    res.send(metrics);
});
app.use(ratingRouter);

app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.status || 500;
    const message = (err instanceof RatingAndReviewServiceError ) ?err.message: 'Internal Server Error';

    res.status(statusCode).json({
        status: false,
        message,
        ...(err.data && {data: err.data})
    });
});


app.listen(PORT, () => {
    console.log(`Rating And Review Service running on http://localhost:${PORT}`);
});