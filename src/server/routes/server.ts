import express, { type Router } from "express";
import {
  routeAuthorAuthorization,
  routeAuthorPing,
  routeInstanceInfo,
  routeOidcCallback
} from "../controllers/oidc.js";
import { routeAuthorAuthenticationMiddleware } from "../middleware/oidc.js";

export default function (): Router {
  const router = express.Router();

  router.get("/auth", routeAuthorAuthorization);
  router.get("/auth/callback", routeOidcCallback);

  router.get("/info", routeInstanceInfo);

  router.use(routeAuthorAuthenticationMiddleware);

  router.get("/ping", routeAuthorPing);

  return router;
}
