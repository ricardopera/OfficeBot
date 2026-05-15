import React, { useState, useCallback, useEffect } from "react";
import { Card, Form, Input, Button, Checkbox, Message, QRCode } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";

interface LoginPageProps {
  onLoginSuccess?: () => void;
  onForgotPassword?: () => void;
}

export function LoginPage({ onLoginSuccess, onForgotPassword }: LoginPageProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"password" | "qrcode">("password");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrCodeExpiry, setQrCodeExpiry] = useState<number | null>(null);

  useEffect(() => {
    if (mode === "qrcode") {
      generateQRCode();
    }
  }, [mode]);

  const generateQRCode = async () => {
    try {
      const response = await window.electron.ipcRenderer.invoke("auth:generateQRCode");
      if (response.success) {
        setQrCodeUrl(response.data.url);
        setQrCodeExpiry(response.data.expiry);
      }
    } catch (error) {
      Message.error(t("errors.generic"));
    }
  };

  const handlePasswordLogin = useCallback(async () => {
    if (!username || !password) {
      Message.warning(t("validationError"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await window.electron.ipcRenderer.invoke("auth:login", {
        username,
        password,
        rememberMe,
      });

      if (response.success) {
        document.cookie = `officebot-session=${response.data.token}; path=/; SameSite=Strict`;
        Message.success(t("auth.login"));
        onLoginSuccess?.();
      } else {
        Message.error(response.error || t("errors.unauthorized"));
      }
    } catch (error) {
      Message.error(t("errors.unauthorized"));
    } finally {
      setIsLoading(false);
    }
  }, [username, password, rememberMe, t, onLoginSuccess]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePasswordLogin();
    }
  }, [handlePasswordLogin]);

  const handleQRCodeRefresh = useCallback(() => {
    generateQRCode();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg-1)]">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-1)] mb-2">
            OfficeBot
          </h1>
          <p className="text-[var(--color-text-3)]">
            {mode === "password" ? t("auth.signIn") : "Scan QR Code"}
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          <Button
            type={mode === "password" ? "primary" : "secondary"}
            onClick={() => setMode("password")}
          >
            Password
          </Button>
          <Button
            type={mode === "qrcode" ? "primary" : "secondary"}
            onClick={() => setMode("qrcode")}
          >
            QR Code
          </Button>
        </div>

        {mode === "password" && (
          <Form layout="vertical" onSubmit={handlePasswordLogin}>
            <Form.Item label={t("auth.username")} required>
              <Input
                value={username}
                onChange={setUsername}
                placeholder={t("auth.username")}
                onKeyPress={handleKeyPress}
              />
            </Form.Item>

            <Form.Item label={t("auth.password")} required>
              <Input.Password
                value={password}
                onChange={setPassword}
                placeholder={t("auth.password")}
                onKeyPress={handleKeyPress}
              />
            </Form.Item>

            <Form.Item>
              <Checkbox
                checked={rememberMe}
                onChange={setRememberMe}
              >
                {t("auth.rememberMe")}
              </Checkbox>
            </Form.Item>

            <Button
              type="primary"
              long
              loading={isLoading}
              onClick={handlePasswordLogin}
            >
              {t("auth.signIn")}
            </Button>

            <div className="mt-4 text-center">
              <Button
                type="text"
                onClick={onForgotPassword}
              >
                {t("auth.forgotPassword")}
              </Button>
            </div>
          </Form>
        )}

        {mode === "qrcode" && (
          <div className="text-center">
            {qrCodeUrl ? (
              <div className="flex flex-col items-center">
                <QRCode value={qrCodeUrl} size={200} />
                <p className="mt-4 text-[var(--color-text-3)] text-sm">
                  Scan with OfficeBot mobile app
                </p>
                {qrCodeExpiry && (
                  <p className="text-[var(--color-text-3)] text-xs">
                    Expires: {new Date(qrCodeExpiry).toLocaleTimeString("pt-BR")}
                  </p>
                )}
                <Button
                  type="text"
                  className="mt-2"
                  onClick={handleQRCodeRefresh}
                >
                  Refresh QR Code
                </Button>
              </div>
            ) : (
              <div className="py-8">
                <span>{t("common.loading")}</span>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default LoginPage;