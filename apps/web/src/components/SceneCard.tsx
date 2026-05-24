import { ClockCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Descriptions, Space, Tag, Typography } from "antd";
import type { Material, Scene } from "@clipshop/shared";

type Props = {
  scene: Scene;
  material?: Material;
  active?: boolean;
  onSelect: () => void;
};

export function SceneCard({ scene, material, active, onSelect }: Props) {
  const cover = material?.thumbnailUrl ?? material?.fileUrl;

  return (
    <button className={`scene-card ${active ? "active" : ""}`} onClick={onSelect} type="button">
      {cover ? <img src={cover} alt={scene.subtitle} /> : <div className="scene-placeholder" />}
      <div className="scene-copy">
        <Space wrap>
          <Tag color="purple">镜头 {scene.order}</Tag>
          <Tag icon={<ClockCircleOutlined />}>{scene.duration}s</Tag>
          <Tag>{scene.transition}</Tag>
          {scene.warnings.length > 0 ? (
            <Tag color="warning" icon={<WarningOutlined />}>
              需检查
            </Tag>
          ) : null}
        </Space>
        <Typography.Title level={5}>{scene.subtitle}</Typography.Title>
        <Typography.Paragraph ellipsis={{ rows: 2 }}>{scene.visualDescription}</Typography.Paragraph>
        <Descriptions column={1} size="small" className="scene-details">
          <Descriptions.Item label="旁白">{scene.voiceover}</Descriptions.Item>
          <Descriptions.Item label="Seedance Prompt">
            <Typography.Text ellipsis>{scene.seedancePrompt}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
        <Button size="small">编辑分镜</Button>
      </div>
    </button>
  );
}
