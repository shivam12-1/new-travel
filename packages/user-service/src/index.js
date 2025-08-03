import {envPath} from "../../../utils/global-utils.js";
import dotenv from 'dotenv';
dotenv.config({ path: envPath()});
import express from 'express';
import routes from "./routes.js";
import "./db.js"
import {register,collectDefaultMetrics} from "prom-client";
import {UserServiceError} from "./utils/myutils.js";
collectDefaultMetrics({register:register});

const app = express();

const PORT = process.env.USER_SERVICE_PORT || 1;

app.use(express.json());

app.use(routes);

app.get('/', (req, res) => {
    return res.json('Hello World USER Service');
});

app.get('/metrics',async (req, res) => {
    res.setHeader('Content-Type',register.contentType);
    const metrics=await register.metrics();
    res.send(metrics);
});

app.listen(PORT, () => {
    console.log(`User Service running on http://localhost:${PORT}`);
});

app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.status || 500;
    const message = (err instanceof UserServiceError) ?err.message: 'Internal Server Error';

    res.status(statusCode).json({
        status: false,
        message,
        ...(err.data && {data: err.data})
    });
});