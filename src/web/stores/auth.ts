import { type Writable, writable } from "svelte/store";
import type { AuthDto, InstanceInfoDto } from "../../shared/types";
import { restGet } from "../utils/data-manager";
import { getApiUri } from "./api";

export const userToken: Writable<string> = writable();

export const instanceInfo: Writable<InstanceInfoDto | undefined> = writable();
export const authorized: Writable<AuthDto | undefined> = writable();
export const authError: Writable<Error> = writable();

export function getAuthUrl(): string {
  return `${getApiUri()}/auth`;
}

export async function ping(): Promise<void> {
  authorized.set(undefined);
  await restGet(`${getApiUri()}/ping`)
    .then((value: unknown): void => {
      const authDto: AuthDto = value as AuthDto;
      authorized.set(authDto);
    })
    .catch((error: Error) => {
      authError.set(error);
    });
}

export async function fetchInstanceInfo(): Promise<void> {
  authorized.set(undefined);
  await restGet(`${getApiUri()}/info`)
    .then((value: unknown): void => {
      const dto: InstanceInfoDto = value as InstanceInfoDto;
      instanceInfo.set(dto);
    })
    .catch((error: Error) => {
      authError.set(error);
    });
}
