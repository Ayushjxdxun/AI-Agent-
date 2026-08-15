import express from "express";
import proxy from "express-http-proxy";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
// import { createProxyMiddleware } from "http-proxy-middleware";
import protect from "./middleware/auth.middleware.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import { proxyWithHeader } from "./utils/proxyWithHeader.js";
import morgan from "morgan";
dotenv.config();

const port = process.env.PORT;

const app = express();
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});
app.use(cors({
  origin: process.env.FRONTEND_URL, 
  credentials: true
}));
app.use(morgan("dev"));
app.use(cookieParser());
app.use("/api/auth", proxy(process.env.AUTH_SERVICE));
app.use("/api/chat",protect, proxyWithHeader(process.env.CHAT_SERVICE));
app.use("/api/agent",protect, proxy(process.env.AGENT_SERVICE));

app.get("/api/me", protect, getCurrentUser);
app.get("/", (req, res) => {
  res.json({ message: "Gateway server is running" });
});
app.listen(port, () => {
  console.log(`Gateway server is running on port ${port}`);
});