import dotenv from "dotenv";
dotenv.config();
import dns from "node:dns";
import express from "express";
import connectDB from "./config/db.js";
// import cors from "cors";
// import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes/agent.route.js"
dns.setServers(["8.8.8.8", "8.8.4.4"]);


const port = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use("/",router)
app.get("/", (req, res) => {
  res.json({ message: "Hello from Agent" });
});
app.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ message: "Attachments exceed the 10 MB upload limit." });
  }
  console.error("Agent request parsing failed:", error);
  return res.status(400).json({ message: "Invalid request body." });
});
app.listen(port, () => {
  console.log(`Agent server is running on port ${port}`);
  connectDB()
});