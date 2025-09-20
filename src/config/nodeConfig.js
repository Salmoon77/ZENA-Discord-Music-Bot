// nodeConfig.js
import dotenv from "dotenv";
dotenv.config();

export default [
  {
    name: "main",
    url: `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT}`,
    auth: process.env.LAVALINK_PASSWORD,
    secure: process.env.LAVALINK_SECURE === "true"
  }
];
