import { envPath } from "../utils/global-utils.js";
import dotenv from "dotenv";
dotenv.config({ path: envPath() });
import express from "express";
import adminRouter from "./routes.js";
import "./db.js";
import cors from "cors";

const app = express();

app.use(cors());
import { register, collectDefaultMetrics } from "prom-client";
collectDefaultMetrics({ register: register });
const PORT = process.env.ADMIN_SERVICE_PORT || 1;

app.use(express.json());

app.use(adminRouter);
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  const metrics = await register.metrics();
  res.send(metrics);
});

app.get("/", (req, res) => {
  return res.json("Hello World ADMIN Service");
});

app.listen(PORT, () => {
  console.log(`Admin Service running on http://localhost:${PORT}`);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: false,
    message: "Internal Server Error",
    error: err.message,
  });
});

export * from "../models/index.js";
export * from "../utils/index.js";
