export const calcFine = (dueDate, referenceDate = new Date(), fineRatePerDay = 50) => {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const ref = new Date(referenceDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((ref - due) / msPerDay);
  return Math.max(0, days) * fineRatePerDay;
};

export const daysOverdue = (dueDate, referenceDate = new Date()) => {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const ref = new Date(referenceDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((ref - due) / msPerDay));
};
