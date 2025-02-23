export class RequestDto<TDto> {
  request: TDto;

  constructor(request: TDto) {
    this.request = request;
  }
}

export abstract class ResponseDto<TDto> {
  response: TDto;

  constructor(response: TDto) {
    this.response = response;
  }
}

export class InstanceInfoDto {
  name: string;
}

export class AuthDto {
  name: string;
}

export class ErrorDto {
  message: string;
  code: string | undefined;
}

export class IdParamsDto {
  id: string; // these parameters always come as string
}
