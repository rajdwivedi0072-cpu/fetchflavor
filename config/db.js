const mongoose = require("mongoose");

/**
 * Global cache for mongoose connection
 * (important for serverless environments)
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

const connectDB = async () => {
  // If already connected, return existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // If no existing connection promise, create one
  if (!cached.promise) {
    const options = {
      bufferCommands: false,        // Prevent query buffering
      maxPoolSize: 10,              // Connection pool size
      serverSelectionTimeoutMS: 5000 // Timeout after 5s
    };

    cached.promise = mongoose
      .connect(process.env.MONGO_URI, options)
      .then((mongooseInstance) => {
        console.log("🟢 MongoDB Connected");
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        console.error("🔴 MongoDB connection error:", err);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
