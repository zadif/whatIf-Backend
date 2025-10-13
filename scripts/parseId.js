export function parseId(id) {
  const parsedId = Number(id);
  if (
    isNaN(parsedId) || // not a number
    parsedId < 0 || // negative
    !Number.isInteger(parsedId) // fraction/decimal
  ) {
    return "error";
  }
  return parsedId;
}
