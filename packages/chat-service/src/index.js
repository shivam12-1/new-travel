import {envPath} from "../../../utils/global-utils.js";
import dotenv from 'dotenv';
dotenv.config({ path: envPath()});
import express from 'express';
import http from 'http';
import "./db.js"
import {WebSocketServer} from 'ws';
import {register,collectDefaultMetrics} from "prom-client";
import chatRouter from "./routes.js";
import {ChatService} from "./handler.js";
import {ChatServiceError} from "./utils/myutils.js";


const PORT = process.env.CHAT_SERVICE_PORT || 6;
collectDefaultMetrics({register:register});
const app = express();
const server=http.createServer(app);

const wss=new WebSocketServer({server})

app.use(express.json());
app.use(chatRouter);

app.get('/', (req, res) => {
    return res.json('Hello World Chat Service');
});

wss.on('connection',ChatService.startRealTimeChat);
app.get('/metrics',async (req, res) => {
    res.setHeader('Content-Type',register.contentType);
    const metrics=await register.metrics();
    res.send(metrics);
});



app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.status || 500;
    const message = (err instanceof ChatServiceError) ?err.message: 'Internal Server Error';

    res.status(statusCode).json({
        status: false,
        message,
        ...(err.data && {data: err.data})
    });
});


server.listen(PORT, () => {
    console.log(`Chat  Service running on http://localhost:${PORT}`);
});