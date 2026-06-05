export const calcDueDate = (issueDate = new Date(), loanDays = 14) => {
  const d = new Date(issueDate);
  d.setDate(d.getDate() + loanDays);
  return d;
};
