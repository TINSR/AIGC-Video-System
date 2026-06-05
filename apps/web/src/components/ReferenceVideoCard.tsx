import { Card, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import type { ReferenceVideo } from "@clipshop/shared";
import { resolveAssetUrl } from "../services/api";

const DEFAULT_REFERENCE_VIDEO_COVER = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7moLjlvI/mlrDlnYDlm77niYc8L3RleHQ+PC9zdmc+";

const platformCopy: Record<ReferenceVideo["sourcePlatform"], string> = {
  douyin_shop: "抖音电商",
  tiktok_shop: "TikTok Shop",
  instagram: "Instagram",
  facebook: "Facebook",
  merchant_upload: "商家上传",
  other: "其他"
};

const sourceTypeCopy: Record<ReferenceVideo["sourceType"], string> = {
  merchant_owned: "商家自有",
  licensed_public: "已授权公开视频",
  public_reference: "公开视频参考"
};

const statusCopy: Record<ReferenceVideo["analysisStatus"], { text: string; color: string }> = {
  pending: { text: "待分析", color: "default" },
  running: { text: "分析中", color: "blue" },
  success: { text: "分析完成", color: "green" },
  failed: { text: "分析失败", color: "red" }
};

type Props = {
  video: ReferenceVideo;
};

export function ReferenceVideoCard({ video }: Props) {
  const videoUrl = resolveAssetUrl(video.fileUrl ?? video.publicUrl);
  const displayKeywords = video.keywords.slice(0, 3);

  return (
    <Link to={`/reference-videos/${video.id}`}>
      <Card
        hoverable
        cover={
          <div className="reference-video-cover">
            {videoUrl ? (
              <video
                aria-label={video.title}
                src={videoUrl}
                poster={DEFAULT_REFERENCE_VIDEO_COVER}
                preload="metadata"
                muted
                playsInline
                onLoadedMetadata={(event) => {
                  const element = event.currentTarget;
                  if (element.duration > 0) element.currentTime = Math.min(0.1, element.duration);
                }}
                style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }}
              />
            ) : (
              <img
                alt={video.title}
                src={DEFAULT_REFERENCE_VIDEO_COVER}
                style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }}
              />
            )}
          </div>
        }
        styles={{ body: { padding: "12px" } }}
      >
        <Card.Meta
          title={
            <Typography.Text ellipsis={{ tooltip: video.title }}>
              {video.title}
            </Typography.Text>
          }
          description={
            <div className="reference-video-card-info">
              <div className="card-tags">
                <Tag>{platformCopy[video.sourcePlatform]}</Tag>
                <Tag>{sourceTypeCopy[video.sourceType]}</Tag>
                {video.category && <Tag>{video.category}</Tag>}
              </div>
              <div className="card-status">
                <Tag color={statusCopy[video.analysisStatus].color}>
                  {statusCopy[video.analysisStatus].text}
                </Tag>
              </div>
              {displayKeywords.length > 0 && (
                <div className="card-keywords">
                  {displayKeywords.map((keyword) => (
                    <Tag key={keyword} color="blue">
                      {keyword}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          }
        />
      </Card>
    </Link>
  );
}
