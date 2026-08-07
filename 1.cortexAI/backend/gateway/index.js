import express from "express";
import proxy from "express-http-proxy";
import dotenv from "dotenv";
// import cors from "cors";
// import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const port = process.env.PORT;

const app = express();

app.use("/auth",proxy(process.env.AUTH_SERVICE));

app.get("/", (req, res) => {
  res.json({ message: "Gateway server is running" });
});
app.listen(port, () => {
  console.log(`Gateway server is running on port ${port}`);
});