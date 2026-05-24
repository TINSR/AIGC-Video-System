import { DownloadOutlined } from "@ant-design/icons";
import { Button, Empty, Space, Typography } from "antd";
import { resolveAssetUrl } from "../services/api";

type Props = {
  videoUrl?: string;
};

export function VideoPreviewPlayer({ videoUrl }: Props) {
  const resolvedUrl = videoUrl ? resolveAssetUrl(videoUrl) : undefined;
  return (
    <div className="video-preview surface">
      {resolvedUrl ? (
        <video controls poster="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=900&q=80">
          <source src={resolvedUrl} type="video/mp4" />
        </video>
      ) : (
        <Empty description="暂无成片，Mock 模式展示预览容器" />
      )}
      <Space className="video-actions">
        <Typography.Text type="secondary">输出格式：mp4 · 720x1280 · 15s 内</Typography.Text>
        <Button icon={<DownloadOutlined />} disabled={!resolvedUrl} href={resolvedUrl} download>
          下载成片
        </Button>
      </Space>
    </div>
  );
}
