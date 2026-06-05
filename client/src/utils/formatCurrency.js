export const formatNGN = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "NGN 0";
  const n = Number(amount);
  const fixed = Math.abs(n) < 1 ? n.toFixed(2) : String(n);
  const [intPart, decPart] = String(fixed).split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = n < 0 ? "-" : "";
  return `NGN ${sign}${withCommas}${decPart ? "." + decPart : ""}`;
};
