import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import dotenv from "dotenv";

dotenv.config();

const server = Fastify({
  logger: true,
});

// Register plugins
server.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
});

server.register(jwt, {
  secret: process.env.JWT_SECRET || "supersecret-change-in-production",
});

server.register(cookie, {
  secret: process.env.COOKIE_SECRET || "cookie-secret-change-in-production",
});

// Health check route
server.get("/health", async (request, reply) => {
  return {
    status: "ok",
    message: "atomcamp Cheating Detection API is running",
    timestamp: new Date().toISOString(),
  };
});

// Start server
const start = async () => {
  try {
    await server.listen({
      port: Number(process.env.PORT) || 4000,
      host: "0.0.0.0",
    });
    console.log("Server running on http://localhost:4000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();