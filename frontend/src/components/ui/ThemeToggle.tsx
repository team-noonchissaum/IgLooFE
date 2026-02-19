import { useThemeStore } from "@/stores/themeStore";

export function ThemeToggle() {
  const isDark = useThemeStore((s) => s.isDark);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-text-main transition-colors"
      title={isDark ? "라이트 모드" : "다크 모드"}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {isDark ? (
        <span className="material-symbols-outlined">light_mode</span>
      ) : (
        <span className="material-symbols-outlined">dark_mode</span>
      )}
    </button>
  );
}
