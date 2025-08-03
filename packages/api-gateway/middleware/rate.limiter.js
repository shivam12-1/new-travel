// rateLimiter.js

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minutes
const MAX_REQUESTS = 100;

const requestCounts = new Map(); // key: IP, value: { count, windowStart }

export function rateLimiter(req, res, next) {
    const ip = req.ip;
    const now = Date.now();

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, windowStart: now });
        return next();
    }

    const data = requestCounts.get(ip);

    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
        requestCounts.set(ip, { count: 1, windowStart: now });
        return next();
    }

    if (data.count < MAX_REQUESTS) {
        data.count++;
        return next();
    }

    res.status(429).send('Too many requests - try again later');
}
