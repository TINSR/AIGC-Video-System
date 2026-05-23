import { DownloadOutlined } from "@ant-design/icons";
import { Button, Empty, Space, Typography } from "antd";

type Props = {
  videoUrl?: string;
};

export function VideoPreviewPlayer({ videoUrl }: Props) {
  return (
    <div className="video-preview surface">
      {videoUrl ? (
        <video controls poster="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=900&q=80">
          <source src={videoUrl} type="video/mp4" />
        </video>
      ) : (
        <Empty description="暂无成片，Mock 模式展示预览容器" />
      )}
      <Space className="video-actions">
        <Typography.Text type="secondary">输出格式：mp4 · 720x1280 · 15s 内</Typography.Text>
        <Button icon={<DownloadOutlined />} disabled={!videoUrl}>
          下载成片
        </Button>
      </Space>
    </div>
  );
}
