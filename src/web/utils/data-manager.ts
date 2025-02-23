import { RequestDto } from "../../shared/types";
// @ts-ignore
import { modalErrorText } from "../stores/content";

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return headers;
}

export async function restGet<TDto>(endpoint: string): Promise<TDto> {
  const response: Response = await fetch(endpoint, {
    headers: getHeaders()
  });
  if (response.ok) {
    return await response.json();
  }
  throw new Error(await response.text());
}

export async function restMethod<TResponseDto>(
  endpoint: string,
  method: string
): Promise<TResponseDto> {
  const response = await fetch(endpoint, {
    method,
    headers: getHeaders()
  });
  if (response.ok) {
    return await response.json();
  }
  throw new Error(await response.text());
}

export async function restMethodNoData(
  endpoint: string,
  method: string
): Promise<boolean> {
  const response = await fetch(endpoint, {
    method,
    headers: getHeaders()
  });
  if (response.ok) {
    return true;
  }
  return false;
}

export async function restBody<TRequestDto, TResponseDto>(
  endpoint: string,
  method: string,
  requestDto: TRequestDto
): Promise<TResponseDto> {
  const response = await fetch(endpoint, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(new RequestDto(requestDto))
  });
  if (response.ok) {
    return await response.json();
  }
  throw new Error(await response.text());
}

export function catchError(error: Error): void {
  modalErrorText.set(error.message);
  console.error(error.message);
}
