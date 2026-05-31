import { Alert, Button, Col, Descriptions, Row, Space, Spin, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { GenerationTask } from "@clipshop/shared";
import { AnalyticsMetricCard } from "../components/AnalyticsMetricCard";
import { VideoPreviewPlayer } from "../components/VideoPreviewPlayer";
import { api, resolveAssetUrl } from "../services/api";

export function VideoPage() {
  const { videoId = "task_001" } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<GenerationTask>();
  const [loading, setLoading] = useState(true);
  const [rerendering, setRerendering] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);

    api
      .getTask(videoId)
      .then((nextTask) => {
        if (alive) setTask(nextTask);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "加载视频任务失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [videoId]);

  if (loading) return <Spin fullscreen />;

  const resolvedOutputUrl = resolveAssetUrl(task?.outputVideoUrl);
  const mayHaveExpiredUrl = !!task?.outputVideoUrl && !resolvedOutputUrl;

  const handleRerender = async () => {
    if (!task) return;
    setRerendering(true);
    setError(undefined);
    try {
      const nextTask = await api.renderPlan(task.creativePlanId);
      message.success("已重新创建渲染任务");
      navigate(`/tasks/${nextTask.id}`);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "重新渲染失败";
      setError(messageText);
      message.error(messageText);
    } finally {
      setRerendering(false);
    }
  };

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Step 6</Typography.Text>
          <Typography.Title level={2}>视频预览与导出</Typography.Title>
          <Typography.Paragraph>
            任务成功后可直接预览 mp4，也可以打开后端输出链接或下载保存。
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Link to="/">
            <Button>返回工作台</Button>
          </Link>
          {task ? (
            <Link to={`/tasks/${task.id}`}>
              <Button>返回任务页</Button>
            </Link>
          ) : null}
          <Button loading={rerendering} disabled={!task} onClick={handleRerender}>
            重新渲染
          </Button>
        </Space>
      </section>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {task?.status === "failed" ? (
        <Alert type="error" showIcon message={task.errorMessage ?? "视频生成失败，请返回任务页查看日志。"} />
      ) : null}
      {mayHaveExpiredUrl || (task?.status === "success" && !task.outputVideoUrl) ? (
        <Alert
          type="warning"
          showIcon
          message="视频链接可能已过期，请重新生成或联系后端重新下载。"
          description="可以先打开原始链接确认；如果远端 URL 或本地 /outputs 不可访问，请返回任务页查看日志，或点击重新渲染。"
        />
      ) : null}
      {!task ? (
        <Alert type="warning" showIcon message="暂未获取到视频任务数据。" />
      ) : (
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={10}>
            <VideoPreviewPlayer videoUrl={task.outputVideoUrl} />
          </Col>
          <Col xs={24} xl={14}>
            <div className="surface">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="status">
                  <Tag color={task.status === "success" ? "green" : task.status === "failed" ? "red" : "blue"}>
                    {task.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="currentStep">{task.currentStep}</Descriptions.Item>
                <Descriptions.Item label="provider">{task.provider}</Descriptions.Item>
                <Descriptions.Item label="outputVideoUrl">
                  {resolvedOutputUrl ? (
                    <a href={resolvedOutputUrl} target="_blank" rel="noreferrer">
                      {resolvedOutputUrl}
                    </a>
                  ) : (
                    "暂无"
                  )}
                </Descriptions.Item>
              </Descriptions>
            </div>
            <Row gutter={[16, 16]} className="recommendation">
              <Col xs={24} md={8}>
                <AnalyticsMetricCard title="播放" value={12800} />
              </Col>
              <Col xs={24} md={8}>
                <AnalyticsMetricCard title="点击率" value={7.4} suffix="%" />
              </Col>
              <Col xs={24} md={8}>
                <AnalyticsMetricCard title="完播率" value={72} suffix="%" />
              </Col>
            </Row>
            <div className="surface recommendation">
              <Typography.Title level={4}>优化建议</Typography.Title>
              <Typography.Paragraph>
                第 2 个分镜的商品特写停留时间较短，后续可结合真实数据回流生成对比版本。
              </Typography.Paragraph>
            </div>
          </Col>
        </Row>
      )}
    </Space>
  );
}
