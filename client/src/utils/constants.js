export const ROLES = {
  ADMIN: "admin",
  LIBRARIAN: "librarian",
  MEMBER: "member",
};

export const TXN_STATUS = {
  ISSUED: "Issued",
  RETURNED: "Returned",
  OVERDUE: "Overdue",
  LOST: "Lost",
};

export const MEMBER_TYPES = ["Student", "Staff", "External"];
export const GENDERS = ["Male", "Female", "Other"];

export const DEFAULT_LOAN_DAYS = 14;
export const DEFAULT_FINE_PER_DAY = 50;
export const DEFAULT_MAX_BOOKS = 3;
export const DEFAULT_MAX_RENEWALS = 2;
export const DEFAULT_MEMBERSHIP_MONTHS = 12;

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 400;
