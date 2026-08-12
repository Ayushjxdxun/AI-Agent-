import dotenv from "dotenv";
dotenv.config();
import dns from "node:dns";
import express from "express";
import connectDB from "./config/db.js";
// import cors from "cors";
// import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes/agent.route.js"
dns.setServers(["8.8.8.8", "8.8.4.4"]);


const port = process.env.PORT;

const app = express();
app.use(express.json());
app.use("/",router)
app.get("/", (req, res) => {
  res.json({ message: "Hello from Agent" });
});
app.listen(port, () => {
  console.log(`Agent server is running on port ${port}`);
  connectDB()
});