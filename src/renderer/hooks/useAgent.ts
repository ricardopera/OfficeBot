import { useState, useCallback, useEffect } from "react";
import { Message } from "@arco-design/web-react";
import { useTranslation } from "./useTranslation";

export interface Agent {
  id: string;
  name: string;
  backend: string;
  status: "online" | "offline" | "busy";
  model?: string;
  config?: Record<string, any>;
}

interface UseAgentOptions {
  agentId?: string;
  onStatusChange?: (status: Agent["status"]) => void;
}

export function useAgent({ agentId, onStatusChange }: UseAgentOptions = {}) {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (agentId && agents.length > 0) {
      const agent = agents.find(a => a.id === agentId);
      setCurrentAgent(agent || null);
    }
  }, [agentId, agents]);

  const loadAgents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await window.electron.ipcRenderer.invoke("agent:getAll");
      if (response.success) {
        setAgents(response.data || []);
      } else {
        setAgents([]);
      }
    } catch (error) {
      setError(t("errors.generic"));
      Message.error(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };

  const selectAgent = useCallback((id: string) => {
    const agent = agents.find(a => a.id === id);
    setCurrentAgent(agent || null);
  }, [agents]);

  const updateAgentConfig = useCallback(
    async (id: string, config: Record<string, any>) => {
      try {
        const response = await window.electron.ipcRenderer.invoke("agent:updateConfig", id, config);
        if (response.success) {
          setAgents(prev =>
            prev.map(a => (a.id === id ? { ...a, config: { ...a.config, ...config } } : a))
          );
          if (currentAgent?.id === id) {
            setCurrentAgent(prev => (prev ? { ...prev, config: { ...prev.config, ...config } } : null));
          }
          Message.success(t("common.success"));
        } else {
          Message.error(response.error || t("errors.generic"));
        }
      } catch (error) {
        Message.error(t("errors.generic"));
      }
    },
    [currentAgent, t]
  );

  const refreshAgents = useCallback(async () => {
    await loadAgents();
  }, []);

  const getAgentByBackend = useCallback(
    (backend: string) => {
      return agents.find(a => a.backend === backend);
    },
    [agents]
  );

  return {
    agents,
    currentAgent,
    isLoading,
    error,
    selectAgent,
    updateAgentConfig,
    refreshAgents,
    getAgentByBackend,
    loadAgents,
  };
}

export default useAgent;