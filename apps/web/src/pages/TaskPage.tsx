import { Alert, Button, Descriptions, Space, Spin, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { GenerationTask } from "@clipshop/shared";
import { TaskLogList } from "../components/TaskLogList";
import { TaskProgressTimeline } from "../components/TaskProgressTimeline";
import { api, resolveAssetUrl } from "../services/api";

const terminalStatuses = new Set(["success", "failed"]);
const fallbackDisabledMessage = "当前为生产严格模式，FFmpeg fallback 已关闭。";

const providerCopy: Record<GenerationTask["provider"], { text: string; color: string; alertType: "success" | "warning" }> = {
  seedance_1_5: { text: "Seedance 真实生成", color: "green", alertType: "success" },
  ffmpeg_fallback: { text: "FFmpeg 演示兜底", color: "gold", alertType: "warning" },
  smart_clip_edit: { text: "智能素材剪辑", color: "blue", alertType: "success" }
};

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes} 分 ${rest} 秒` : `${rest} 秒`;
}

function isFallbackDisabledError(message?: string) {
  if (!message) return false;
  return /fallback/i.test(message) && /(关闭|禁用|disabled|strict|ALLOW_FFMPEG_FALLBACK)/i.test(message);
}

function isDownloadingVideo(task?: GenerationTask) {
  const text = [task?.currentStep, ...(task?.logs ?? []).map((log) => log.message)].filter(Boolean).join(" ");
  return /(下载|download|落盘|outputs)/i.test(text);
}

export function TaskPage() {
  const { taskId = "task_001" } = useParams();
  const [task, setTask] = useState<GenerationTask>();
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(() => Date.now());

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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  const resolvedOutputUrl = resolveAssetUrl(task?.outputVideoUrl);
  const elapsedSeconds = task?.createdAt ? Math.max(0, Math.floor((now - Date.parse(task.createdAt)) / 1000)) : 0;
  const waiting = !!task && !terminalStatuses.has(task.status);
  const latestLog = task?.logs?.[task.logs.length - 1];
  const provider = task ? providerCopy[task.provider] : undefined;
  const fallbackDisabled = isFallbackDisabledError(error) || isFallbackDisabledError(task?.errorMessage);
  const downloadingVideo = isDownloadingVideo(task);
  const fallbackStatus = task?.provider === "ffmpeg_fallback"
    ? "已进入 FFmpeg fallback"
    : fallbackDisabled
      ? "生产严格模式已关闭 fallback"
      : "未触发 fallback";

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Step 5</Typography.Text>
          <Typography.Title level={2}>任务进度</Typography.Title>
          <Typography.Paragraph>{task?.currentStep ?? "等待任务状态返回"}</Typography.Paragraph>
        </div>
        <Space wrap>
          <Link to="/">
            <Button>返回工作台</Button>
          </Link>
          {task?.status === "success" ? (
            <Link to={`/videos/${task.id}`}>
              <Button type="primary">预览成片</Button>
            </Link>
          ) : (
            <Button onClick={handleRetry} loading={retrying} disabled={!task || task.status !== "failed"}>
              重试生成
            </Button>
          )}
        </Space>
      </section>
      {provider ? (
        <Alert type={provider.alertType} showIcon message={`当前为 ${provider.text}`} />
      ) : null}
      {fallbackDisabled ? <Alert type="warning" showIcon message={fallbackDisabledMessage} /> : null}
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {task?.errorMessage ? <Alert type="error" showIcon message={task.errorMessage} /> : null}
      {waiting ? (
        <Alert
          type="info"
          showIcon
          message={`远端生成通常需要 2-5 分钟，已等待 ${formatElapsed(elapsedSeconds)}`}
          description={`当前步骤：${task.currentStep || "等待后端更新"}。${downloadingVideo ? "正在下载视频。" : "等待远端视频返回。"}当前 provider：${provider?.text ?? task.provider}。fallback 状态：${fallbackStatus}。最新日志：${latestLog?.message ?? "暂无日志"}`}
        />
      ) : null}
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
              <Descriptions.Item label="已等待">{formatElapsed(elapsedSeconds)}</Descriptions.Item>
              <Descriptions.Item label="currentStep">{task.currentStep}</Descriptions.Item>
              <Descriptions.Item label="正在下载视频">{downloadingVideo ? "是" : "否"}</Descriptions.Item>
              <Descriptions.Item label="provider">
                <Space wrap>
                  <Typography.Text>{task.provider}</Typography.Text>
                  <Tag color={provider?.color}>{provider?.text}</Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="fallback 状态">{fallbackStatus}</Descriptions.Item>
              <Descriptions.Item label="outputVideoUrl">
                {resolvedOutputUrl ? (
                  <a href={resolvedOutputUrl} target="_blank" rel="noreferrer">
                    {resolvedOutputUrl}
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
