import type { Response } from "express";

export function sendError(
  res: Response,
  errorCode: number,
  errorText: string
): void {
  res.status(errorCode).send({ errorText });
}
