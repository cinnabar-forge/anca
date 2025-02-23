let dtoCache: Record<string, any> = {};

export function clearDtoCache(): void {
  dtoCache = {};
}

export function addDtoToCache<T>(cacheId: string, dto: T): void {
  dtoCache[cacheId] = dto;
}

export function getDtoCache<T>(cacheId: string): T {
  return dtoCache[cacheId];
}
