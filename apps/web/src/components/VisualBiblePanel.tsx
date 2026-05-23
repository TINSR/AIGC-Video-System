import { Card, Descriptions, Space, Tag } from "antd";
import type { VisualBible } from "@clipshop/shared";

type Props = {
  visualBible: VisualBible;
};

export function VisualBiblePanel({ visualBible }: Props) {
  return (
    <Card className="surface" title="Visual Bible">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="画幅">{visualBible.aspectRatio}</Descriptions.Item>
        <Descriptions.Item label="风格">{visualBible.style}</Descriptions.Item>
        <Descriptions.Item label="色调">{visualBible.colorTone}</Descriptions.Item>
        <Descriptions.Item label="光线">{visualBible.lighting}</Descriptions.Item>
        <Descriptions.Item label="镜头">{visualBible.cameraStyle}</Descriptions.Item>
        <Descriptions.Item label="商品外观">{visualBible.productAppearance}</Descriptions.Item>
      </Descriptions>
      <Space wrap className="tag-row">
        {visualBible.mainScenes.map((scene) => (
          <Tag color="purple" key={scene}>
            {scene}
          </Tag>
        ))}
      </Space>
      <Space direction="vertical" className="rule-list">
        {visualBible.continuityRules.map((rule) => (
          <Tag key={rule}>{rule}</Tag>
        ))}
      </Space>
    </Card>
  );
}
