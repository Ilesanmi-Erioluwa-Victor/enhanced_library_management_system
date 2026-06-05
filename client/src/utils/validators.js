export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
export const isPhone = (v) => /^[+0-9\s-]{7,20}$/.test(String(v || "").trim());
export const isNonEmpty = (v) => String(v || "").trim().length > 0;
export const minLength = (v, n) => String(v || "").length >= n;
