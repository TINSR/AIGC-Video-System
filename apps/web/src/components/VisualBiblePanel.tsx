import { Card, Descriptions, Space, Tag, Typography } from "antd";
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
      <Typography.Text type="secondary">主场景</Typography.Text>
      <Space wrap className="tag-row">
        {visualBible.mainScenes.map((scene) => (
          <Tag color="purple" key={scene}>
            {scene}
          </Tag>
        ))}
      </Space>
      <Typography.Text type="secondary">连续性规则</Typography.Text>
      <Space direction="vertical" className="rule-list">
        {visualBible.continuityRules.map((rule) => (
          <Tag key={rule}>{rule}</Tag>
        ))}
      </Space>
    </Card>
  );
}
