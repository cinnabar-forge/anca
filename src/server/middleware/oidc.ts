import type { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "../services/oidc.js";
import { getAncaSessionCookieObject } from "../utils/cookies.js";

export async function routeAuthorAuthenticationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.ancaSession;

  if (!token) {
    res.sendStatus(401);
    return;
  }

  try {
    const result = await verifySessionToken(token);

    if (result == null) {
      res.clearCookie("ancaSession");
      res.sendStatus(401);
      return;
    }

    res.locals.authDto = result.authDto;

    if (result.sessionToken) {
      res.cookie(
        "ancaSession",
        result.sessionToken,
        getAncaSessionCookieObject()
      );
    }

    next();
  } catch (error) {
    console.error("Token validation error:", error);
    res.status(401).send("Unauthorized");
  }
}
