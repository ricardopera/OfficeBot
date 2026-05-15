import React, { useState, useCallback, useEffect } from "react";
import { Card, Table, Tag, Button, Modal, Message, Badge } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
  status: "online" | "offline" | "busy";
  joinedAt: number;
}

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
}

interface MailboxMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  timestamp: number;
  read: boolean;
}

export function TeamPage() {
  const { t } = useTranslation();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mailbox, setMailbox] = useState<MailboxMessage[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"grid" | "mailbox" | "tasks">("grid");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    setIsLoading(true);
    try {
      const response = await window.electron.ipcRenderer.invoke("team:getAll");
      if (response.success) {
        setMembers(response.data.members || []);
        setTasks(response.data.tasks || []);
        setMailbox(response.data.mailbox || []);
      }
    } catch (error) {
      Message.error(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = useCallback(() => {
    Modal.confirm({
      title: t("actions.join"),
      content: "Send invitation link?",
      onOk: async () => {
        Message.success(t("common.success"));
      },
    });
  }, [t]);

  const handleRemoveMember = useCallback((memberId: string) => {
    Modal.confirm({
      title: t("common.confirm"),
      content: "Remove this member from team?",
      onOk: async () => {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        Message.success(t("common.success"));
      },
    });
  }, [t]);

  const handleAssignTask = useCallback((taskId: string, memberId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, assignee: memberId } : t))
    );
  }, []);

  const getStatusColor = (status: TeamMember["status"]) => {
    switch (status) {
      case "online": return "green";
      case "busy": return "red";
      case "offline": return "gray";
    }
  };

  const getRoleColor = (role: TeamMember["role"]) => {
    switch (role) {
      case "admin": return "arcoblue";
      case "member": return "green";
      case "viewer": return "gray";
    }
  };

  const memberColumns = [
    { title: "Name", dataIndex: "name" },
    { title: "Email", dataIndex: "email" },
    {
      title: "Role",
      dataIndex: "role",
      render: (role: TeamMember["role"]) => <Tag color={getRoleColor(role)}>{role}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: TeamMember["status"]) => (
        <Badge text={status} status={status} />
      ),
    },
    {
      title: "Actions",
      render: (_: any, record: TeamMember) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => setSelectedMember(record.id)}>
            {t("common.edit")}
          </Button>
          <Button size="small" status="warning" onClick={() => handleRemoveMember(record.id)}>
            {t("common.delete")}
          </Button>
        </div>
      ),
    },
  ];

  const taskColumns = [
    { title: "Title", dataIndex: "title" },
    { title: "Assignee", dataIndex: "assignee" },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: Task["status"]) => {
        const colors = { pending: "default", in_progress: "blue", completed: "green" };
        return <Tag color={colors[status]}>{status.replace("_", " ")}</Tag>;
      },
    },
    {
      title: "Priority",
      dataIndex: "priority",
      render: (priority: Task["priority"]) => {
        const colors = { low: "gray", medium: "orange", high: "red" };
        return <Tag color={colors[priority]}>{priority}</Tag>;
      },
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-1)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-1)]">
          Team
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setActiveView("grid")}>Grid</Button>
          <Button onClick={() => setActiveView("mailbox")}>Mailbox</Button>
          <Button onClick={() => setActiveView("tasks")}>Tasks</Button>
          <Button type="primary" onClick={handleInviteMember}>
            + {t("actions.add")}
          </Button>
        </div>
      </div>

      {activeView === "grid" && (
        <Card>
          <Table
            columns={memberColumns}
            data={members}
            pagination={false}
            loading={isLoading}
          />
        </Card>
      )}

      {activeView === "tasks" && (
        <Card>
          <Table
            columns={taskColumns}
            data={tasks}
            pagination={false}
            loading={isLoading}
          />
        </Card>
      )}

      {activeView === "mailbox" && (
        <Card>
          <div className="space-y-2">
            {mailbox.map(msg => (
              <div
                key={msg.id}
                className={`p-4 border border-[var(--color-border)] rounded cursor-pointer hover:bg-[var(--color-bg-2)] ${
                  !msg.read ? "bg-[var(--color-bg-2)]" : ""
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{msg.from}</span>
                  <span className="text-[var(--color-text-3)] text-sm">
                    {new Date(msg.timestamp).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="text-[var(--color-text-2)]">{msg.subject}</div>
                <div className="text-[var(--color-text-3)] text-sm truncate">{msg.preview}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default TeamPage;