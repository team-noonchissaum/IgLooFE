import dayjs from "dayjs";

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export function formatKrw(amount: number): string {
  return krwFormatter.format(amount);
}

export function formatDate(date: string | Date): string {
  return dayjs(date).format("YYYY-MM-DD");
}

export function formatDateTime(date: string | Date): string {
  return dayjs(date).format("YYYY-MM-DD HH:mm");
}

export function formatRelative(date: string | Date): string {
  const d = dayjs(date);
  const now = dayjs();
  const diffMin = now.diff(d, "minute");
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = now.diff(d, "hour");
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = now.diff(d, "day");
  if (diffDay < 7) return `${diffDay}일 전`;
  return d.format("YYYY-MM-DD");
}

/** 남은 시간 HH:MM:SS (초 단위) */
export function formatRemainingSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
