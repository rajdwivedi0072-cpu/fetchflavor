const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");

require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // ✅ replace body-parser

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/user", userRoutes);

// ❌ DO NOT use app.listen() on Vercel
module.exports = app;
