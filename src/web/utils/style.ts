import { getTextColor } from "./color";

export function getImageSizeStyle(size: string) {
  return `max-width: ${size}; max-height: ${size}; width: auto; height: auto;`;
}

export function getStyleForColor(
  color?: string | null,
  background?: boolean
): string {
  const newColor = color || "#808080";
  const result: string[] = [];

  if (background) {
    result.push(`background-color: ${newColor};`);
    result.push(`color: ${getTextColor(newColor)};`);
  }
  result.push(`border-color: ${newColor};`);

  return result.join(" ");
}
