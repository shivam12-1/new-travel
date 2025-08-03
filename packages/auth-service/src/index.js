import {envPath} from "./utils/global-utils.js";
import dotenv from 'dotenv';
dotenv.config({ path: envPath()});
import express from 'express';
import "./db.js"
const app = express();
import {register,collectDefaultMetrics} from "prom-client";
import authRouter from "./routes.js";
import {AuthServiceError} from "./utils/myutils.js";
collectDefaultMetrics({register:register});

const PORT = process.env.AUTH_SERVICE_PORT || 8;

app.use(express.json());
app.use(authRouter);

app.get('/', (req, res) => {
    return res.json('Hello World Auth Service');
});

app.get('/metrics',async (req, res) => {
    res.setHeader('Content-Type',register.contentType);
    const metrics=await register.metrics();
    res.send(metrics);
});

app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.status || 500;
    const message = (err instanceof AuthServiceError) ?err.message: 'Internal Server Error';


    res.status(statusCode).json({
        status: false,
        message,
        ...(err.data && {data: err.data})
    });
});

app.listen(PORT, () => {
    console.log(`Auth  Service running on http://localhost:${PORT}`);
});