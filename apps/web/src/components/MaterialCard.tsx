import { PlayCircleOutlined } from "@ant-design/icons";
import { Space, Tag, Typography } from "antd";
import type { Material } from "@clipshop/shared";

type MaterialCardProps = {
  material: Material;
};

export function MaterialCard({ material }: MaterialCardProps) {
  const cover = material.thumbnailUrl ?? material.fileUrl;

  return (
    <article className="material-card">
      <img src={cover} alt={material.title} />
      {material.type === "video" && <PlayCircleOutlined className="play-badge" />}
      <div className="material-body">
        <Space split={<span className="dot" />} wrap>
          <Tag color={material.type === "video" ? "geekblue" : "cyan"}>{material.type}</Tag>
          {material.duration ? <Typography.Text type="secondary">{material.duration}s</Typography.Text> : null}
        </Space>
        <Typography.Title level={5}>{material.title}</Typography.Title>
        <Typography.Paragraph ellipsis={{ rows: 2 }}>{material.aiDescription}</Typography.Paragraph>
        <Space wrap>
          {material.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      </div>
    </article>
  );
}
