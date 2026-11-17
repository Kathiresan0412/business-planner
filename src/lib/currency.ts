const lkrFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

export function formatLkr(value: number) {
  return lkrFormatter.format(value);
}

export function formatLkrText(value: string) {
  return value.replace(/₹\s*/g, "LKR ");
}
