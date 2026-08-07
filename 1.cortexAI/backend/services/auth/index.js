import dns from "node:dns";
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import router from "./routes/auth.route.js";
// import cors from "cors";
// import { createProxyMiddleware } from "http-proxy-middleware";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const port = process.env.PORT;

const app = express();
app.use(express.json());
app.use("/", router);
app.get("/", (req, res) => {
  res.json({ message: "Hello from Auth" });
});
app.listen(port, () => {
  console.log(`Auth server is running on port ${port}`);
  connectDB()
});