import { Col, Row, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { GenerationTask } from "@clipshop/shared";
import { AnalyticsMetricCard } from "../components/AnalyticsMetricCard";
import { VideoPreviewPlayer } from "../components/VideoPreviewPlayer";
import { api } from "../services/api";

export function VideoPage() {
  const { videoId = "task_001" } = useParams();
  const [task, setTask] = useState<GenerationTask>();

  useEffect(() => {
    api.getTask(videoId).then(setTask);
  }, [videoId]);

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Step 6</Typography.Text>
          <Typography.Title level={2}>视频预览与导出</Typography.Title>
        </div>
      </section>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={10}>
          <VideoPreviewPlayer videoUrl={task?.outputVideoUrl} />
        </Col>
        <Col xs={24} xl={14}>
          <Row gutter={[16, 16]}>
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
              第 2 个分镜的商品特写停留时间较短，Day 2 后可结合真实数据回流生成对比版本。
            </Typography.Paragraph>
          </div>
        </Col>
      </Row>
    </Space>
  );
}
