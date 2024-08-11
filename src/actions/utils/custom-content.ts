export const CUSTOM_CONTENT_ANCHOR_START =
  "// [ANCA-ANCHOR-CUSTOM-CONTENT-START]";
export const CUSTOM_CONTENT_ANCHOR_END = "// [ANCA-ANCHOR-CUSTOM-CONTENT-END]";

/**
 *
 * @param contents
 */
export function extractCustomContent(contents: string): string {
  const startIndex =
    contents.indexOf(CUSTOM_CONTENT_ANCHOR_START) +
    CUSTOM_CONTENT_ANCHOR_START.length;
  const endIndex = contents.indexOf(CUSTOM_CONTENT_ANCHOR_END);
  return contents.substring(startIndex, endIndex).trim();
}

/**
 *
 * @param contents
 */
export function extractNonCustomContent(contents: string): string {
  const startIndex = contents.indexOf(CUSTOM_CONTENT_ANCHOR_START);
  const endIndex =
    contents.indexOf(CUSTOM_CONTENT_ANCHOR_END) +
    CUSTOM_CONTENT_ANCHOR_END.length;

  const beforeCustomContent = contents.substring(0, startIndex).trim();
  const afterCustomContent = contents.substring(endIndex).trim();

  return `${beforeCustomContent}\n${afterCustomContent}`;
}
