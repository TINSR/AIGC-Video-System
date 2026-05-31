import { DownloadOutlined, LinkOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Alert, Button, Empty, Space, Typography } from "antd";
import { resolveAssetUrl } from "../services/api";

type Props = {
  videoUrl?: string;
};

export function VideoPreviewPlayer({ videoUrl }: Props) {
  const resolvedUrl = resolveAssetUrl(videoUrl);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  useEffect(() => {
    setHasPlaybackError(false);
  }, [resolvedUrl]);

  return (
    <div className="video-preview surface">
      {resolvedUrl && !hasPlaybackError ? (
        <video
          controls
          poster="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=900&q=80"
          onError={() => setHasPlaybackError(true)}
        >
          <source src={resolvedUrl} type="video/mp4" />
        </video>
      ) : resolvedUrl ? (
        <Alert
          showIcon
          type="warning"
          message="视频预览加载失败"
          description="视频链接可能已过期，请重新生成或联系后端重新下载。也可以先使用打开视频或下载成片确认资源。"
        />
      ) : (
        <Empty description="暂无成片，任务成功后将在这里预览 mp4。" />
      )}
      <Space className="video-actions" wrap>
        <Typography.Text type="secondary">
          {resolvedUrl ? `视频地址：${resolvedUrl}` : "输出格式：mp4 / 720x1280 / 约 15s"}
        </Typography.Text>
        <Space wrap>
          <Button icon={<LinkOutlined />} disabled={!resolvedUrl} href={resolvedUrl} target="_blank">
            打开视频
          </Button>
          <Button icon={<DownloadOutlined />} disabled={!resolvedUrl} href={resolvedUrl} download>
            下载成片
          </Button>
        </Space>
      </Space>
    </div>
  );
}
