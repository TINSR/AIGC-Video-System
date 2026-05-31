import { PlayCircleOutlined } from "@ant-design/icons";
import { Space, Tag, Typography } from "antd";
import type { Material } from "@clipshop/shared";
import { resolveAssetUrl } from "../services/api";

type MaterialCardProps = {
  material: Material;
};

const cloudStatusCopy: Record<NonNullable<Material["cloudStatus"]>, { text: string; color: string }> = {
  uploaded: { text: "已上传云端", color: "green" },
  local_only: { text: "仅本地可用", color: "gold" },
  failed: { text: "上传云端失败", color: "red" }
};

function getCloudStatus(material: Material) {
  return material.cloudStatus ?? (material.publicUrl ? "uploaded" : "local_only");
}

export function MaterialCard({ material }: MaterialCardProps) {
  const cover = resolveAssetUrl(material.thumbnailUrl ?? material.fileUrl) ?? material.publicUrl ?? material.fileUrl;
  const cloudStatus = cloudStatusCopy[getCloudStatus(material)];

  return (
    <article className="material-card">
      <img src={cover} alt={material.title} />
      {material.type === "video" && <PlayCircleOutlined className="play-badge" />}
      <div className="material-body">
        <Space split={<span className="dot" />} wrap>
          <Tag color={material.type === "video" ? "geekblue" : "cyan"}>{material.type}</Tag>
          <Tag color={cloudStatus.color}>{cloudStatus.text}</Tag>
          {material.duration ? <Typography.Text type="secondary">{material.duration}s</Typography.Text> : null}
        </Space>
        <Typography.Title level={5}>{material.title}</Typography.Title>
        <Typography.Paragraph ellipsis={{ rows: 2 }}>{material.aiDescription}</Typography.Paragraph>
        {material.type === "video" ? (
          <Typography.Paragraph className="material-video-hint" type="secondary">
            视频素材已保存。当前版本将逐步支持抽帧作为参考图。
          </Typography.Paragraph>
        ) : null}
        <Space wrap>
          {material.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      </div>
    </article>
  );
}
