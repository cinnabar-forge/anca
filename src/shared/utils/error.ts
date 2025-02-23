import { ErrorDto } from "../types.js";

export function errorToDto(message: string, code?: string): ErrorDto {
  const errorDto = new ErrorDto();
  errorDto.message = message;
  errorDto.code = code;
  return errorDto;
}
