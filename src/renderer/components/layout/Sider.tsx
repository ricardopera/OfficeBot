import React, { useState, useCallback } from "react";
import { Menu, IconHome, IconSettings, IconTool, IconUser, IconMenu } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";

interface SiderProps {
  activeKey?: string;
  onNavigate?: (key: string) => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

interface NavItem {
  key: string;
  title: string;
  icon?: React.ReactNode;
}

export function Sider({ activeKey = "chat", onNavigate, collapsed = false, onCollapse }: SiderProps) {
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    { key: "chat", title: t("chat.title"), icon: <IconHome /> },
    { key: "guid", title: t("chat.newChat"), icon: <IconMenu /> },
    { key: "team", title: "Team", icon: <IconUser /> },
    { key: "cron", title: "Cron", icon: <IconTool /> },
    { key: "settings", title: t("settings.title"), icon: <IconSettings /> },
  ];

  const handleClick = useCallback(
    (key: string) => {
      onNavigate?.(key);
    },
    [onNavigate]
  );

  return (
    <div
      className={`flex flex-col h-full bg-[var(--color-bg-2)] border-r border-[var(--color-border)] transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        {!collapsed && (
          <span className="text-lg font-bold text-[var(--color-text-1)]">
            OfficeBot
          </span>
        )}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="p-1 hover:bg-[var(--color-bg-3)] rounded"
        >
          <IconMenu />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {navItems.map(item => (
          <div
            key={item.key}
            onClick={() => handleClick(item.key)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
              activeKey === item.key
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-text-2)] hover:bg-[var(--color-bg-3)]"
            }`}
          >
            {item.icon && <span className="text-lg">{item.icon}</span>}
            {!collapsed && <span>{item.title}</span>}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[var(--color-border)]">
        {!collapsed && (
          <div className="text-xs text-[var(--color-text-3)]">
            <div>OfficeBot v1.0.0</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sider;