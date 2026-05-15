import React, { useState, useCallback } from "react";
import { Card, Select, Input, Button, Form, Message } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";

interface Agent {
  id: string;
  name: string;
  backend: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
}

interface GuidPageProps {
  onStartConversation?: (agentId: string, modelId: string, prompt: string) => void;
}

export function GuidPage({ onStartConversation }: GuidPageProps) {
  const { t } = useTranslation();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [presetAssistant, setPresetAssistant] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const agents: Agent[] = [
    { id: "acp", name: "ACP", backend: "acp" },
    { id: "gemini", name: "Gemini", backend: "gemini" },
    { id: "aionrs", name: "AionRS", backend: "aionrs" },
    { id: "openclaw", name: "OpenClaw", backend: "openclaw" },
    { id: "nanobot", name: "Nanobot", backend: "nanobot" },
    { id: "remote", name: "Remote", backend: "remote" },
  ];

  const models: Model[] = [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google" },
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "anthropic" },
  ];

  const presetAssistants = [
    { id: "developer", name: "Developer" },
    { id: "writer", name: "Writer" },
    { id: "analyst", name: "Analyst" },
    { id: "assistant", name: "Assistant" },
  ];

  const handleStart = useCallback(async () => {
    if (!selectedAgent || !prompt.trim()) {
      Message.warning(t("chat.typePlaceholder"));
      return;
    }

    setIsLoading(true);
    try {
      await onStartConversation?.(selectedAgent, selectedModel, prompt);
    } catch (error) {
      Message.error(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgent, selectedModel, prompt, onStartConversation, t]);

  const handleSelectPreset = useCallback((presetId: string) => {
    setPresetAssistant(presetId);
    const preset = presetAssistants.find(p => p.id === presetId);
    if (preset) {
      setPrompt(`You are a ${preset.name}. `);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-1)] p-6">
      <div className="max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 text-[var(--color-text-1)]">
          {t("chat.newChat")}
        </h1>

        <Card className="mb-4">
          <Form layout="vertical">
            <Form.Item label={t("agent.selectAgent")}>
              <Select
                value={selectedAgent}
                onChange={setSelectedAgent}
                placeholder={t("agent.selectAgent")}
              >
                {agents.map(agent => (
                  <Select.Option key={agent.id} value={agent.id}>
                    {agent.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label={t("agent.model")}>
              <Select
                value={selectedModel}
                onChange={setSelectedModel}
                placeholder={t("agent.model")}
              >
                {models.map(model => (
                  <Select.Option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Workspace">
              <Input
                value={workspacePath}
                onChange={setWorkspacePath}
                placeholder="/path/to/workspace"
              />
            </Form.Item>

            <Form.Item label="Preset Assistants">
              <div className="flex gap-2 flex-wrap">
                {presetAssistants.map(preset => (
                  <Button
                    key={preset.id}
                    type={presetAssistant === preset.id ? "primary" : "secondary"}
                    onClick={() => handleSelectPreset(preset.id)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </Form.Item>

            <Form.Item label={t("chat.sendMessage")}>
              <Input.TextArea
                value={prompt}
                onChange={value => setPrompt(value)}
                placeholder={t("chat.typePlaceholder")}
                autoSize={{ minRows: 3, maxRows: 8 }}
              />
            </Form.Item>

            <Button
              type="primary"
              long
              loading={isLoading}
              onClick={handleStart}
              disabled={!selectedAgent || !prompt.trim()}
            >
              {t("chat.send")}
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}

export default GuidPage;