import {envPath} from "../../../utils/global-utils.js";
import dotenv from 'dotenv';
dotenv.config({ path: envPath()});
import express from 'express';
import "./db.js"
import crypto from 'crypto';
import paymentRouter from "./routes.js";
import {register,collectDefaultMetrics} from "prom-client";
import {PaymentServiceError} from "./utils/myutils.js";
collectDefaultMetrics({register:register});

const app = express();

const PORT = process.env.PAYMENT_SERVICE_PORT || 3;

app.use(express.json());

app.get('/', (req, res) => {
    return res.json('Hello World Payment Service');
});

app.get('/metrics',async (req, res) => {
    res.setHeader('Content-Type',register.contentType);
    const metrics=await register.metrics();
    res.send(metrics);
});

app.use(paymentRouter);


app.post('/webhook', (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    const signature = req.headers['x-razorpay-signature'];

    if (digest === signature) {
        console.log('Webhook verified');

    } else {
        console.log('Invalid signature');
        return res.status(400).send('Invalid signature');
    }

    res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.status || 500;
    const message = (err instanceof PaymentServiceError ) ?err.message: 'Internal Server Error';

    res.status(statusCode).json({
        status: false,
        message,
        ...(err.data && {data: err.data})
    });
});

app.listen(PORT, () => {
    console.log(`Payment Service running on http://localhost:${PORT}`);
});