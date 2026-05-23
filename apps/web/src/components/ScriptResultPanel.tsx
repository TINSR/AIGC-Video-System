import { Card, Descriptions, Typography } from "antd";
import type { CreativePlan } from "@clipshop/shared";

type Props = {
  plan: CreativePlan;
};

export function ScriptResultPanel({ plan }: Props) {
  return (
    <Card className="surface" title="广告脚本">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="标题">{plan.title}</Descriptions.Item>
        <Descriptions.Item label="Hook">{plan.hook}</Descriptions.Item>
        <Descriptions.Item label="广告词">
          <Typography.Text>{plan.adCopy}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="CTA">{plan.cta}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
