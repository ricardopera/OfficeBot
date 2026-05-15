import React, { useState, useCallback, useRef, useEffect } from "react";
import { Input, Button, IconSend, IconLoading } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";

interface SendBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  onRegenerate?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
}

export function SendBox({
  value,
  onChange,
  onSend,
  onStop,
  onRegenerate,
  disabled = false,
  streaming = false,
  placeholder,
}: SendBoxProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && !streaming && value.trim()) {
          onSend();
        }
      }
    },
    [disabled, streaming, value, onSend]
  );

  const handleSend = useCallback(() => {
    if (!disabled && !streaming && value.trim()) {
      onSend();
    }
  }, [disabled, streaming, value, onSend]);

  const autoResize = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  return (
    <div className="flex items-end gap-2 p-4 bg-[var(--color-bg-1)] border-t border-[var(--color-border)]">
      <div className="flex-1">
        <Input.TextArea
          ref={inputRef as any}
          value={value}
          onChange={e => {
            onChange(e.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t("chat.typePlaceholder")}
          disabled={disabled}
          autoSize={{ minRows: 1, maxRows: 6 }}
          className="resize-none"
        />
      </div>

      <div className="flex gap-2">
        {streaming && onStop && (
          <Button onClick={onStop} status="warning">
            {t("chat.stop")}
          </Button>
        )}

        {!streaming && onRegenerate && value && (
          <Button onClick={onRegenerate}>
            {t("chat.regenerate")}
          </Button>
        )}

        <Button
          type="primary"
          disabled={disabled || !value.trim()}
          onClick={handleSend}
          className="flex items-center gap-2"
        >
          {streaming ? <IconLoading /> : <IconSend />}
          {t("chat.send")}
        </Button>
      </div>
    </div>
  );
}

export default SendBox;