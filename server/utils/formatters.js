const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatNGN = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "NGN 0";
  const n = Number(amount);
  const fixed = Math.abs(n) < 1 ? n.toFixed(2) : String(n);
  const [intPart, decPart] = String(fixed).split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = n < 0 ? "-" : "";
  return `NGN ${sign}${withCommas}${decPart ? "." + decPart : ""}`;
};

module.exports = { formatDate, formatNGN };
