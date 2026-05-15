import React, { useState, useCallback, useEffect } from "react";
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Message, Popconfirm } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  agentType: string;
  prompt: string;
  status: "active" | "paused" | "failed";
  lastRun: number | null;
  nextRun: number | null;
  createdAt: number;
}

export function CronPage() {
  const { t } = useTranslation();
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [newJob, setNewJob] = useState<Partial<CronJob>>({
    name: "",
    schedule: "",
    agentType: "acp",
    prompt: "",
  });

  useEffect(() => {
    loadCronJobs();
  }, []);

  const loadCronJobs = async () => {
    setIsLoading(true);
    try {
      const response = await window.electron.ipcRenderer.invoke("cron:getAll");
      if (response.success) {
        setCronJobs(response.data || []);
      }
    } catch (error) {
      Message.error(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJob = useCallback(async () => {
    if (!newJob.name || !newJob.schedule || !newJob.prompt) {
      Message.warning(t("validationError"));
      return;
    }

    try {
      const response = await window.electron.ipcRenderer.invoke("cron:create", newJob);
      if (response.success) {
        setCronJobs(prev => [...prev, response.data]);
        setShowCreateModal(false);
        setNewJob({ name: "", schedule: "", agentType: "acp", prompt: "" });
        Message.success(t("common.success"));
      }
    } catch (error) {
      Message.error(t("errors.generic"));
    }
  }, [newJob, t]);

  const handleDeleteJob = useCallback(async (jobId: string) => {
    try {
      const response = await window.electron.ipcRenderer.invoke("cron:delete", jobId);
      if (response.success) {
        setCronJobs(prev => prev.filter(j => j.id !== jobId));
        Message.success(t("common.success"));
      }
    } catch (error) {
      Message.error(t("errors.generic"));
    }
  }, [t]);

  const handleToggleJob = useCallback(async (jobId: string, currentStatus: CronJob["status"]) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const response = await window.electron.ipcRenderer.invoke("cron:update", jobId, { status: newStatus });
      if (response.success) {
        setCronJobs(prev =>
          prev.map(j => (j.id === jobId ? { ...j, status: newStatus } : j))
        );
        Message.success(t("common.success"));
      }
    } catch (error) {
      Message.error(t("errors.generic"));
    }
  }, [t]);

  const handleViewDetail = useCallback((job: CronJob) => {
    setSelectedJob(job);
    setShowDetailModal(true);
  }, []);

  const handleRunNow = useCallback(async (jobId: string) => {
    try {
      const response = await window.electron.ipcRenderer.invoke("cron:runNow", jobId);
      if (response.success) {
        Message.success(t("common.success"));
      }
    } catch (error) {
      Message.error(t("errors.generic"));
    }
  }, [t]);

  const getStatusColor = (status: CronJob["status"]) => {
    switch (status) {
      case "active": return "green";
      case "paused": return "orange";
      case "failed": return "red";
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("pt-BR");
  };

  const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Schedule", dataIndex: "schedule" },
    { title: "Agent", dataIndex: "agentType" },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: CronJob["status"]) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    { title: "Last Run", dataIndex: "lastRun", render: (time: number | null) => formatDate(time) },
    { title: "Next Run", dataIndex: "nextRun", render: (time: number | null) => formatDate(time) },
    {
      title: "Actions",
      render: (_: any, record: CronJob) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => handleViewDetail(record)}>
            View
          </Button>
          <Button size="small" onClick={() => handleRunNow(record.id)}>
            Run Now
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleJob(record.id, record.status)}
          >
            {record.status === "active" ? "Pause" : "Resume"}
          </Button>
          <Popconfirm
            title="Delete this cron job?"
            onOk={() => handleDeleteJob(record.id)}
          >
            <Button size="small" status="warning">
              {t("common.delete")}
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-1)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">
          Cron Jobs
        </h1>
        <Button type="primary" onClick={() => setShowCreateModal(true)}>
          + {t("actions.add")}
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={cronJobs}
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Create Cron Job"
        visible={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        onOk={handleCreateJob}
      >
        <Form layout="vertical">
          <Form.Item label="Name" required>
            <Input
              value={newJob.name}
              onChange={value => setNewJob(prev => ({ ...prev, name: value }))}
              placeholder="My Cron Job"
            />
          </Form.Item>

          <Form.Item label="Schedule (cron)" required>
            <Input
              value={newJob.schedule}
              onChange={value => setNewJob(prev => ({ ...prev, schedule: value }))}
              placeholder="0 * * * *"
            />
          </Form.Item>

          <Form.Item label="Agent Type">
            <Select
              value={newJob.agentType}
              onChange={value => setNewJob(prev => ({ ...prev, agentType: value }))}
            >
              <Select.Option value="acp">ACP</Select.Option>
              <Select.Option value="gemini">Gemini</Select.Option>
              <Select.Option value="aionrs">AionRS</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Prompt" required>
            <Input.TextArea
              value={newJob.prompt}
              onChange={value => setNewJob(prev => ({ ...prev, prompt: value }))}
              placeholder="Task description..."
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Cron Job Details"
        visible={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        onOk={() => setShowDetailModal(false)}
      >
        {selectedJob && (
          <div className="space-y-4">
            <div><strong>Name:</strong> {selectedJob.name}</div>
            <div><strong>Schedule:</strong> {selectedJob.schedule}</div>
            <div><strong>Agent:</strong> {selectedJob.agentType}</div>
            <div><strong>Status:</strong> <Tag color={getStatusColor(selectedJob.status)}>{selectedJob.status}</Tag></div>
            <div><strong>Last Run:</strong> {formatDate(selectedJob.lastRun)}</div>
            <div><strong>Next Run:</strong> {formatDate(selectedJob.nextRun)}</div>
            <div><strong>Prompt:</strong></div>
            <div className="p-3 bg-[var(--color-bg-2)] rounded">{selectedJob.prompt}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CronPage;