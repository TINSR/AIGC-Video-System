import { Alert, Button, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { GenerationTask } from "@clipshop/shared";
import { TaskLogList } from "../components/TaskLogList";
import { TaskProgressTimeline } from "../components/TaskProgressTimeline";
import { api } from "../services/api";

export function TaskPage() {
  const { taskId = "task_001" } = useParams();
  const [task, setTask] = useState<GenerationTask>();

  useEffect(() => {
    api.getTask(taskId).then(setTask);
  }, [taskId]);

  if (!task) return null;

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Step 5</Typography.Text>
          <Typography.Title level={2}>任务进度</Typography.Title>
          <Typography.Paragraph>{task.currentStep}</Typography.Paragraph>
        </div>
        {task.status === "success" ? (
          <Link to={`/videos/${task.id}`}>
            <Button type="primary">预览成片</Button>
          </Link>
        ) : (
          <Button>重试生成</Button>
        )}
      </section>
      {task.errorMessage ? <Alert type="error" showIcon message={task.errorMessage} /> : null}
      <TaskProgressTimeline task={task} />
      <TaskLogList logs={task.logs} />
    </Space>
  );
}
