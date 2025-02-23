import type { CookieOptions } from "express";
import config from "../config.js";

export function getAncaSessionCookieObject(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(Date.now() + config.sessionExpireTime * 1000)
    // secure: true
  };
}
