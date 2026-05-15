import React, { useState, useCallback } from "react";
import { Tabs, Card, Form, Input, Switch, Select, Button, Message, Tag } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";

type SettingsTab = "general" | "gemini" | "aionrs" | "assistants" | "capabilities" | "display" | "webui" | "pet" | "system" | "extensions";

export function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settings, setSettings] = useState<Record<string, any>>({});

  const updateSetting = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    Message.success(t("common.save"));
  }, [t]);

  const renderGeneralSettings = () => (
    <Card>
      <Form layout="vertical">
        <Form.Item label={t("settings.language")}>
          <Select
            value={settings.language || "pt-BR"}
            onChange={value => updateSetting("language", value)}
          >
            <Select.Option value="pt-BR">Português (Brasil)</Select.Option>
            <Select.Option value="en-US">English (US)</Select.Option>
            <Select.Option value="zh-CN">中文</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label={t("settings.theme")}>
          <Select
            value={settings.theme || "system"}
            onChange={value => updateSetting("theme", value)}
          >
            <Select.Option value="light">{t("settings.light")}</Select.Option>
            <Select.Option value="dark">{t("settings.dark")}</Select.Option>
            <Select.Option value="system">{t("settings.system")}</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label={t("settings.notifications")}>
          <Switch
            checked={settings.notifications ?? true}
            onChange={checked => updateSetting("notifications", checked)}
          />
        </Form.Item>
      </Form>
    </Card>
  );

  const renderGeminiSettings = () => (
    <Card>
      <Form layout="vertical">
        <Form.Item label="API Key">
          <Input.Password
            value={settings.geminiApiKey || ""}
            onChange={value => updateSetting("geminiApiKey", value)}
            placeholder="AIza..."
          />
        </Form.Item>

        <Form.Item label={t("agent.model")}>
          <Select
            value={settings.geminiModel || "gemini-2.5-flash"}
            onChange={value => updateSetting("geminiModel", value)}
          >
            <Select.Option value="gemini-2.5-flash">Gemini 2.5 Flash</Select.Option>
            <Select.Option value="gemini-pro">Gemini Pro</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label={t("agent.temperature")}>
          <Input
            type="number"
            value={settings.geminiTemperature || "0.7"}
            onChange={value => updateSetting("geminiTemperature", value)}
            placeholder="0.0 - 1.0"
          />
        </Form.Item>
      </Form>
    </Card>
  );

  const renderAionRSSettings = () => (
    <Card>
      <Form layout="vertical">
        <Form.Item label="Endpoint">
          <Input
            value={settings.aionrsEndpoint || "http://localhost:8080"}
            onChange={value => updateSetting("aionrsEndpoint", value)}
            placeholder="http://localhost:8080"
          />
        </Form.Item>

        <Form.Item label={t("agent.model")}>
          <Input
            value={settings.aionrsModel || ""}
            onChange={value => updateSetting("aionrsModel", value)}
            placeholder="model-name"
          />
        </Form.Item>
      </Form>
    </Card>
  );

  const renderAssistantsSettings = () => (
    <Card>
      <div className="space-y-4">
        {["Developer", "Writer", "Analyst", "Assistant"].map(name => (
          <div key={name} className="flex items-center justify-between p-3 border border-[var(--color-border)] rounded">
            <span>{name}</span>
            <div className="flex gap-2">
              <Button size="small">{t("common.edit")}</Button>
              <Button size="small" status="warning">{t("common.delete")}</Button>
            </div>
          </div>
        ))}
        <Button type="dashed" long>+ {t("actions.add")}</Button>
      </div>
    </Card>
  );

  const renderCapabilitiesSettings = () => (
    <Card>
      <Form layout="vertical">
        {["file_read", "file_write", "shell", "web_search"].map(cap => (
          <Form.Item key={cap} label={cap.replace("_", " ")}>
            <Switch
              checked={settings[`cap_${cap}`] ?? true}
              onChange={checked => updateSetting(`cap_${cap}`, checked)}
            />
          </Form.Item>
        ))}
      </Form>
    </Card>
  );

  const renderDisplaySettings = () => (
    <Card>
      <Form layout="vertical">
        <Form.Item label={t("settings.appearance")}>
          <Select
            value={settings.displayDensity || "comfortable"}
            onChange={value => updateSetting("displayDensity", value)}
          >
            <Select.Option value="compact">Compact</Select.Option>
            <Select.Option value="comfortable">Comfortable</Select.Option>
            <Select.Option value="spacious">Spacious</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="Font Size">
          <Select
            value={settings.fontSize || "14"}
            onChange={value => updateSetting("fontSize", value)}
          >
            <Select.Option value="12">12px</Select.Option>
            <Select.Option value="14">14px</Select.Option>
            <Select.Option value="16">16px</Select.Option>
            <Select.Option value="18">18px</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderWebUISettings = () => (
    <Card>
      <Form layout="vertical">
        <Form.Item label="Port">
          <Input
            type="number"
            value={settings.webuiPort || "3000"}
            onChange={value => updateSetting("webuiPort", value)}
          />
        </Form.Item>

        <Form.Item label="CORS Origins">
          <Input.TextArea
            value={settings.corsOrigins || "*"}
            onChange={value => updateSetting("corsOrigins", value)}
            placeholder="* or specific origins"
          />
        </Form.Item>

        <Form.Item label={t("settings.privacy")}>
          <Switch
            checked={settings.requireAuth ?? true}
            onChange={checked => updateSetting("requireAuth", checked)}
          />
          <span className="ml-2">Require Authentication</span>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderPetSettings = () => (
    <Card>
      <Form layout="vertical">
        <Form.Item label="Enable Pet">
          <Switch
            checked={settings.petEnabled ?? false}
            onChange={checked => updateSetting("petEnabled", checked)}
          />
        </Form.Item>

        <Form.Item label="Pet Type">
          <Select
            value={settings.petType || "cat"}
            onChange={value => updateSetting("petType", value)}
          >
            <Select.Option value="cat">Cat</Select.Option>
            <Select.Option value="dog">Dog</Select.Option>
            <Select.Option value="robot">Robot</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderSystemSettings = () => (
    <Card>
      <Form layout="vertical">
        <Form.Item label="Data Directory">
          <Input
            value={settings.dataDir || ""}
            onChange={value => updateSetting("dataDir", value)}
            placeholder="/path/to/data"
          />
        </Form.Item>

        <Form.Item label="Log Level">
          <Select
            value={settings.logLevel || "info"}
            onChange={value => updateSetting("logLevel", value)}
          >
            <Select.Option value="debug">Debug</Select.Option>
            <Select.Option value="info">Info</Select.Option>
            <Select.Option value="warn">Warn</Select.Option>
            <Select.Option value="error">Error</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="Auto Update">
          <Switch
            checked={settings.autoUpdate ?? true}
            onChange={checked => updateSetting("autoUpdate", checked)}
          />
        </Form.Item>
      </Form>
    </Card>
  );

  const renderExtensionsSettings = () => (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span>{t("settings.extensions") || "Extensions"}</span>
          <Tag color="green">officebot-extension.json</Tag>
        </div>
        {["Extension 1", "Extension 2"].map(name => (
          <div key={name} className="flex items-center justify-between p-3 border border-[var(--color-border)] rounded">
            <span>{name}</span>
            <div className="flex gap-2">
              <Switch defaultChecked />
              <Button size="small" status="warning">{t("common.delete")}</Button>
            </div>
          </div>
        ))}
        <Button type="dashed" long>+ {t("actions.add")} Extension</Button>
      </div>
    </Card>
  );

  const tabs: { key: SettingsTab; title: string; content: () => JSX.Element }[] = [
    { key: "general", title: t("settings.general"), content: renderGeneralSettings },
    { key: "gemini", title: "Gemini", content: renderGeminiSettings },
    { key: "aionrs", title: "AionRS", content: renderAionRSSettings },
    { key: "assistants", title: "Assistants", content: renderAssistantsSettings },
    { key: "capabilities", title: "Capabilities", content: renderCapabilitiesSettings },
    { key: "display", title: "Display", content: renderDisplaySettings },
    { key: "webui", title: "WebUI", content: renderWebUISettings },
    { key: "pet", title: "Pet", content: renderPetSettings },
    { key: "system", title: "System", content: renderSystemSettings },
    { key: "extensions", title: "Extensions", content: renderExtensionsSettings },
  ];

  const activeContent = tabs.find(tab => tab.key === activeTab)?.content();

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-1)]">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-[var(--color-text-1)]">
          {t("settings.title")}
        </h1>
        <Tabs
          activeTab={activeTab}
          onChange={(key) => setActiveTab(key as SettingsTab)}
          tabs={tabs.map(tab => ({ key: tab.key, title: tab.title }))}
        />
        <div className="mt-4">{activeContent}</div>
      </div>
    </div>
  );
}

export default SettingsPage;