import type { Request, Response } from "express";
import type { InstanceInfoDto } from "../../shared/types.js";
import config from "../config.js";
import {
  getOidcRedirectHtmlMarkup,
  processOidcResponse
} from "../services/oidc.js";
import { getAncaSessionCookieObject } from "../utils/cookies.js";

export async function routeAuthorAuthorization(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    res
      .status(200)
      .contentType("text/html")
      .send(await getOidcRedirectHtmlMarkup());
  } catch (error) {
    console.error("OIDC authorize error:", error.message);
    res.redirect(config.devWebUri ?? "/");
  }
}

export async function routeOidcCallback(
  req: Request,
  res: Response
): Promise<void> {
  const { code, state } = req.query;

  try {
    if (!code) {
      throw new Error("Authorization code is missing");
    }
    if (!state) {
      throw new Error("State code is missing");
    }

    const sessionToken = await processOidcResponse(
      code as string,
      state as string
    );
    res.cookie(
      "ancaSession",
      sessionToken,
      getAncaSessionCookieObject()
    );
    res.redirect(config.devWebUri ?? "/");
  } catch (error) {
    console.error("OIDC callback error:", error.message);
    res.redirect(config.devWebUri ?? "/");
  }
}

export async function routeAuthorPing(
  _req: Request,
  res: Response
): Promise<void> {
  res.json(res.locals.authDto);
}

export async function routeInstanceInfo(
  _req: Request,
  res: Response<InstanceInfoDto>
): Promise<void> {
  res.json({ name: config.instanceName || "Anca" });
}
