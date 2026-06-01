import { PlayCircleOutlined } from "@ant-design/icons";
import { Button, Space, Tag, Typography } from "antd";
import type { Material } from "@clipshop/shared";
import { resolveAssetUrl } from "../services/api";
import { getMaterialConfidence, getMaterialReason, getMaterialRoleLabel } from "../services/materialMetadata";

type MaterialCardProps = {
  material: Material;
  isPrimary?: boolean;
  primarySaving?: boolean;
  onSetPrimary?: (materialId: string) => void;
};

const cloudStatusCopy: Record<NonNullable<Material["cloudStatus"]>, { text: string; color: string }> = {
  uploaded: { text: "已上传阿里云 OSS", color: "green" },
  local_only: { text: "仅本地可用", color: "gold" },
  failed: { text: "云端上传失败", color: "red" }
};

function getCloudStatus(material: Material) {
  return material.cloudStatus ?? (material.publicUrl ? "uploaded" : "local_only");
}

export function MaterialCard({ material, isPrimary, primarySaving, onSetPrimary }: MaterialCardProps) {
  const cover = resolveAssetUrl(material.thumbnailUrl ?? material.fileUrl) ?? material.publicUrl ?? material.fileUrl;
  const cloudStatus = cloudStatusCopy[getCloudStatus(material)];
  const confidence = getMaterialConfidence(material);
  const reason = getMaterialReason(material) ?? "等待 AI 给出素材推荐理由。";
  const roleLabel = getMaterialRoleLabel(material);

  return (
    <article className="material-card">
      {material.type === "video" ? (
        <video className="material-media" src={resolveAssetUrl(material.fileUrl)} controls muted preload="metadata" />
      ) : (
        <img className="material-media" src={cover} alt={material.title} />
      )}
      {material.type === "video" && <PlayCircleOutlined className="play-badge" />}
      <div className="material-body">
        <Space split={<span className="dot" />} wrap>
          <Tag color={material.type === "video" ? "geekblue" : "cyan"}>{material.type}</Tag>
          <Tag color={cloudStatus.color}>{cloudStatus.text}</Tag>
          <Tag color="purple">素材角色：{roleLabel}</Tag>
          {isPrimary ? <Tag color="green">当前首帧</Tag> : <Tag>非首帧</Tag>}
          {material.duration ? <Typography.Text type="secondary">{material.duration}s</Typography.Text> : null}
        </Space>
        <Typography.Title level={5}>{material.title}</Typography.Title>
        <Typography.Paragraph ellipsis={{ rows: 2 }}>{material.aiDescription}</Typography.Paragraph>
        <div className="material-ai-panel">
          <Typography.Text type="secondary">AI 置信度：{confidence === undefined ? "待评估" : `${confidence}%`}</Typography.Text>
          <Typography.Paragraph ellipsis={{ rows: 2 }}>AI 推荐理由：{reason}</Typography.Paragraph>
        </div>
        {material.type === "video" ? (
          <Typography.Paragraph className="material-video-hint" type="secondary">
            视频素材已保存。当前版本将逐步支持抽帧作为参考图。
          </Typography.Paragraph>
        ) : null}
        {material.type === "image" && onSetPrimary ? (
          <div className="material-primary-action">
            <Button type={isPrimary ? "primary" : "default"} block disabled={isPrimary} loading={primarySaving} onClick={() => onSetPrimary(material.id)}>
              {isPrimary ? "当前商品主图" : "设为商品主图"}
            </Button>
          </div>
        ) : null}
        <Space className="material-tag-list" wrap>
          {material.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      </div>
    </article>
  );
}
