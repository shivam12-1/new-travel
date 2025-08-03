import {envPath} from "../utils/global-utils.js";
import dotenv from 'dotenv';
dotenv.config({ path: envPath()});
import express from 'express';
import jwt from "jsonwebtoken";
import {createProxyMiddleware} from 'http-proxy-middleware';
import {rateLimiter} from "../middleware/rate.limiter.js";
import {apiProtectionMiddleware, apiProtectionMiddlewareAdmin} from "../middleware/auth.middleware.js";
const app = express();
import {register,collectDefaultMetrics} from "prom-client";
import http from "http";
import cors from 'cors';
collectDefaultMetrics({register:register});

const server = http.createServer(app);
const PORT = process.env.API_GATEWAY_PORT || 7;


app.use(cors('*'));
app.use(rateLimiter);
app.use("/user",apiProtectionMiddleware);
app.use("/admin",apiProtectionMiddlewareAdmin);

const PM_AUTH = createProxyMiddleware({
    target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.AUTH_SERVICE_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/session': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log('Incoming path:', req.path);
            console.log('Proxied path:', proxyReq.path);

        },
        proxyRes: (proxyRes, req, res) => {
            // console.log(req.path);
        },
        error: (err, req, res) => {
            console.log(req.path);
        }
    }
});
const PM_ADMIN = createProxyMiddleware({
    target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.ADMIN_SERVICE_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/admin': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log(req.path);
            console.log('Final proxied path:', proxyReq.path);

        },
        proxyRes: (proxyRes, req, res) => {
            console.log(req.path);
        },
        error: (err, req, res) => {
            console.log(req.path);
        }
    }
    });
const PM_CHAT = createProxyMiddleware({
    target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.CHAT_SERVICE_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/user/chat' : '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log(req.path);
            console.log('Final proxied path:', proxyReq.path);

        },
        proxyRes: (proxyRes, req, res) => {
            console.log(req.path);
        },
        error: (err, req, res) => {
            console.log(req.path);
        }
    }
});
const PM_REGISTER = createProxyMiddleware({
    target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.DRIVER_TRANSPORTER_SERVICE_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/user/register': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log(req.path);
            console.log('Final proxied path:', proxyReq.path);

        },
        proxyRes: (proxyRes, req, res) => {
            console.log(req.path);
        },
        error: (err, req, res) => {
            console.log(req.path);
        }
    }
});
const PM_NOTIFICATION = createProxyMiddleware({
    target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.NOTIFICATION_SERVICE_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/user/notification': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log(req.path);
            console.log('Final proxied path:', proxyReq.path);

        },
        proxyRes: (proxyRes, req, res) => {
            console.log(req.path);
        },
        error: (err, req, res) => {
            console.log(req.path);
        }
    }
});
const PM_PAYMENT = createProxyMiddleware({
    target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.PAYMENT_SERVICE_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/user/payment': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log(req.path);
            console.log('Final proxied path:', proxyReq.path);

        },
        proxyRes: (proxyRes, req, res) => {
            console.log(req.path);
        },
        error: (err, req, res) => {
            console.log(req.path);
        }
    }
});
const PM_RTR = createProxyMiddleware({
    target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.REVIEW_AND_RATING_SERVICE_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/user/rtr': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log(req.path);
            console.log('Final proxied path:', proxyReq.path);

        },
        proxyRes: (proxyRes, req, res) => {
            console.log(req.path);
        },
        error: (err, req, res) => {
            console.log(req.path);
        }
    }
});
const PM_USER = createProxyMiddleware({
    target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.USER_SERVICE_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/user': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log(req.path);
            console.log('Final proxied path:', proxyReq.path);

        },
        proxyRes: (proxyRes, req, res) => {
            console.log(req.path);
        },
        error: (err, req, res) => {
            console.log(req.path);
        }
    }
});
const PM_PUBLIC = createProxyMiddleware({
    target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.USER_SERVICE_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/public': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log('Public route:', req.path);
            console.log('Final proxied path:', proxyReq.path);
        },
        proxyRes: (proxyRes, req, res) => {
            console.log(req.path);
        },
        error: (err, req, res) => {
            console.log(req.path);
        }
    }
});
const PM_VEHICLE = createProxyMiddleware({
    target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.VEHICLE_LISTING_SERVICE_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/user/vehicle': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log(req.path);
            console.log('Final proxied path:', proxyReq.path);

        },
        proxyRes: (proxyRes, req, res) => {
            console.log(req.path);
        },
        error: (err, req, res) => {
            console.log(req.path);
        }
    }
});
const 
ws=createProxyMiddleware({pathFilter: '/chat', target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.CHAT_SERVICE_PORT}`, ws: true});



app.get('/', (req, res) => {
    return res.json('Hello World API GATEWAY Service');
});

app.use('/session',PM_AUTH);
app.use('/public', PM_PUBLIC);
app.use('/user/chat',PM_CHAT);
app.use(ws);
app.use('/user/register',PM_REGISTER);
app.use('/user/notification',PM_NOTIFICATION);
app.use('/user/payment',PM_PAYMENT);
app.use('/user/rtr',PM_RTR);
app.use('/user/vehicle',PM_VEHICLE);
app.use('/user',PM_USER);
app.use('/admin',PM_ADMIN);


app.get('/metrics',async (req, res) => {
   res.setHeader('Content-Type',register.contentType);
   const metrics=await register.metrics();
   res.send(metrics);
});

app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        status: false,
        message
    });
});


server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        console.log(decoded);

        url.searchParams.set('userId', decoded.id);
        url.searchParams.set('userRole', decoded.role|| 'user');
        req.url = url.pathname + '?' + url.searchParams.toString();

        ws.upgrade(req, socket, head);
    });
});


server.listen(PORT, () => {
    console.log(`API GATEWAY Service running on ${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${PORT}`);
});