export function isValidUrl(url: string): boolean {
  const uriPattern = /^(https?|http):\/\/[^\s/$.?#].[^\s]*$/i;
  return uriPattern.test(url);
}
