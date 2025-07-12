export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const currentMonthDate = (day: string) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  let d = Number(day);
  if (Number.isNaN(d) && typeof day === "string" && day.includes("-")) {
    // assume full date string, use the day portion
    d = Number(day.slice(-2));
  }

  const lastDay = new Date(year, month, 0).getDate();
  const validDay = Math.min(Math.max(d, 1), lastDay);

  return `${year}-${String(month).padStart(2, "0")}-${String(validDay).padStart(
    2,
    "0"
  )}`;
};

export const dayOfMonth = (value: string | number | null) => {
  if (!value && value !== 0) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.includes("-")) return value.slice(8, 10);
  return value as string;
};
