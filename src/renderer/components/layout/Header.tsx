import React from "react";
import { IconMoon, IconSun, IconMenu } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  onMenuToggle?: () => void;
  theme?: "light" | "dark" | "system";
  onThemeChange?: (theme: "light" | "dark" | "system") => void;
  actions?: React.ReactNode;
}

export function Header({
  title,
  showBack = false,
  onBack,
  onMenuToggle,
  theme = "system",
  onThemeChange,
  actions,
}: HeaderProps) {
  const { t } = useTranslation();

  const toggleTheme = () => {
    const themes: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    onThemeChange?.(nextTheme);
  };

  return (
    <div className="flex items-center justify-between h-14 px-4 bg-[var(--color-bg-2)] border-b border-[var(--color-border)]">
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-2 hover:bg-[var(--color-bg-3)] rounded"
          >
            <IconMenu />
          </button>
        )}

        {showBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-[var(--color-bg-3)] rounded"
          >
            <span>←</span>
          </button>
        )}

        {title && (
          <h1 className="text-lg font-medium text-[var(--color-text-1)]">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-[var(--color-bg-3)] rounded"
          title={t("settings.theme")}
        >
          {theme === "dark" ? <IconMoon /> : <IconSun />}
        </button>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export default Header;