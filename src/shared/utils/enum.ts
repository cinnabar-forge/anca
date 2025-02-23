export function enumToArray(enumme: any): any[] {
  return Object.keys(enumme)
    .filter((value) => !Number.isNaN(Number(value)))
    .map((key) => enumme[key]);
}
