export function copyTextToClipboard(text: string): void {
  const selection = document.getSelection()?.toString();
  const selected =
    selection != null && selection.length > 0 && text.includes(selection)
      ? selection
      : text;
  void navigator.clipboard.writeText(selected);
}
