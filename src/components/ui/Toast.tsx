import { useToastStore, type ToastType } from "@/stores/toastStore";

const typeClass: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-primary text-white",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      role="region"
      aria-label="알림"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
            typeClass[t.type]
          }`}
          role="alert"
        >
          <span className="material-symbols-outlined">
            {t.type === "success"
              ? "check_circle"
              : t.type === "error"
              ? "error"
              : "info"}
          </span>
          <p className="text-sm font-medium">{t.message}</p>
          <button
            type="button"
            onClick={() => remove(t.id)}
            className="p-1 rounded hover:bg-white/20 focus:outline-none"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
