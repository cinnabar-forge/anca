import path from "node:path";
import express, { type Router, type Request, type Response } from "express";

function sendWeb(_req: Request, res: Response): void {
  res.sendFile(path.resolve("dist", "web", "index.html"));
}

export default function (): Router {
  const router = express.Router();
  router.use(express.static("dist/web"));
  router.get("/", sendWeb);
  router.get("/hello", sendWeb);
  return router;
}
