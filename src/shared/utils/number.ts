export function isNumber(value: any) {
  return (
    typeof value === "number" ||
    (typeof value === "string" && !Number.isNaN(Number.parseInt(value)))
  );
}
