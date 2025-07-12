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
  const month = now.getMonth();
  const d = parseInt(day, 10);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const validDay = Math.min(Math.max(d, 1), lastDay);
  const result = new Date(year, month, validDay);
  return result.toISOString().slice(0, 10);
};

export const dayOfMonth = (value: string | null) =>
  value ? value.slice(8, 10) : "";
