import React, { useState, useCallback } from "react";
import { Card, Tag, Badge, Button, Input, Message } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";

interface Agent {
  id: string;
  name: string;
  backend: string;
  status: "online" | "offline" | "busy";
  model?: string;
}

interface AgentListProps {
  agents?: Agent[];
  onSelectAgent?: (agentId: string) => void;
  onRefresh?: () => void;
}

export function AgentList({ agents = [], onSelectAgent, onRefresh }: AgentListProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const defaultAgents: Agent[] = agents.length > 0 ? agents : [
    { id: "acp", name: "ACP Agent", backend: "acp", status: "online" },
    { id: "gemini", name: "Gemini Agent", backend: "gemini", status: "online", model: "gemini-2.5-flash" },
    { id: "aionrs", name: "AionRS Agent", backend: "aionrs", status: "busy" },
    { id: "openclaw", name: "OpenClaw Agent", backend: "openclaw", status: "offline" },
    { id: "nanobot", name: "Nanobot Agent", backend: "nanobot", status: "online" },
    { id: "remote", name: "Remote Agent", backend: "remote", status: "online" },
  ];

  const filteredAgents = defaultAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.backend.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      onRefresh?.();
    } catch (error) {
      Message.error(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  }, [onRefresh, t]);

  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "online": return "green";
      case "busy": return "red";
      case "offline": return "gray";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input.Search
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t("search")}
          className="flex-1"
        />
        <Button onClick={handleRefresh} loading={isLoading}>
          {t("common.retry")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map(agent => (
          <Card
            key={agent.id}
            className="cursor-pointer hover:border-[var(--color-primary)] transition-colors"
            onClick={() => onSelectAgent?.(agent.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-[var(--color-text-1)]">
                  {agent.name}
                </h3>
                <p className="text-sm text-[var(--color-text-3)]">
                  {agent.backend}
                </p>
              </div>
              <Badge status={getStatusColor(agent.status)} text={agent.status} />
            </div>

            <div className="flex items-center justify-between">
              {agent.model && (
                <Tag size="small">{agent.model}</Tag>
              )}
              <Tag size="small" color="arcoblue">{agent.backend}</Tag>
            </div>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-8 text-[var(--color-text-3)]">
          <p>No agents found</p>
        </div>
      )}
    </div>
  );
}

export default AgentList;