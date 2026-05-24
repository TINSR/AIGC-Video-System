import { Alert, Button, Descriptions, Space, Spin, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { GenerationTask } from "@clipshop/shared";
import { TaskLogList } from "../components/TaskLogList";
import { TaskProgressTimeline } from "../components/TaskProgressTimeline";
import { api } from "../services/api";

const terminalStatuses = new Set(["success", "failed"]);

export function TaskPage() {
  const { taskId = "task_001" } = useParams();
  const [task, setTask] = useState<GenerationTask>();
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const nextTask = await api.getTask(taskId);
        if (!alive) return;
        setTask(nextTask);
        setError(undefined);
        setLoading(false);
        if (!terminalStatuses.has(nextTask.status)) {
          timer = window.setTimeout(poll, 2000);
        }
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "查询任务失败");
        setLoading(false);
        timer = window.setTimeout(poll, 2000);
      }
    };

    setLoading(true);
    poll();

    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [taskId]);

  const handleRetry = async () => {
    setRetrying(true);
    setError(undefined);
    try {
      const nextTask = await api.retryTask(taskId);
      setTask(nextTask);
      message.success("已重新提交生成任务");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "重试失败";
      setError(messageText);
      message.error(messageText);
    } finally {
      setRetrying(false);
    }
  };

  if (loading && !task) return <Spin fullscreen />;

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Step 5</Typography.Text>
          <Typography.Title level={2}>任务进度</Typography.Title>
          <Typography.Paragraph>{task?.currentStep ?? "等待任务状态返回"}</Typography.Paragraph>
        </div>
        {task?.status === "success" ? (
          <Link to={`/videos/${task.id}`}>
            <Button type="primary">预览成片</Button>
          </Link>
        ) : (
          <Button onClick={handleRetry} loading={retrying} disabled={!task || task.status !== "failed"}>
            重试生成
          </Button>
        )}
      </section>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {task?.errorMessage ? <Alert type="error" showIcon message={task.errorMessage} /> : null}
      {task ? (
        <>
          <div className="surface">
            <Descriptions column={{ xs: 1, md: 2 }} size="small">
              <Descriptions.Item label="status">
                <Tag color={task.status === "failed" ? "red" : task.status === "success" ? "green" : "blue"}>
                  {task.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="progress">{task.progress}%</Descriptions.Item>
              <Descriptions.Item label="currentStep">{task.currentStep}</Descriptions.Item>
              <Descriptions.Item label="provider">{task.provider}</Descriptions.Item>
              <Descriptions.Item label="outputVideoUrl">
                {task.outputVideoUrl ? (
                  <a href={task.outputVideoUrl} target="_blank" rel="noreferrer">
                    {task.outputVideoUrl}
                  </a>
                ) : (
                  "暂无"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="errorMessage">{task.errorMessage ?? "无"}</Descriptions.Item>
            </Descriptions>
          </div>
          <TaskProgressTimeline task={task} />
          <TaskLogList logs={task.logs ?? []} />
        </>
      ) : (
        <Alert type="warning" showIcon message="暂未获取到任务数据。" />
      )}
    </Space>
  );
}
