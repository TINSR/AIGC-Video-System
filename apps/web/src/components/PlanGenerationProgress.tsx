import { CheckCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { Progress, Steps, Typography } from "antd";

type Props = {
  active: boolean;
};

const steps = [
  "商品分析",
  "创意策略生成",
  "视觉风格设定",
  "分镜脚本生成",
  "Seedance Prompt 生成",
  "合规/连贯性检查"
];

export function PlanGenerationProgress({ active }: Props) {
  return (
    <div className="surface plan-generation-progress">
      <Typography.Title level={4}>CreativePlan 生成进度</Typography.Title>
      <Progress percent={active ? 66 : 0} status={active ? "active" : "normal"} showInfo={false} />
      <Steps
        size="small"
        current={active ? 2 : 0}
        items={steps.map((title, index) => ({
          title,
          icon: active && index <= 2 ? <LoadingOutlined /> : <CheckCircleOutlined />
        }))}
      />
      <Typography.Text type="secondary">
        当前为前端进度占位，后续可接入真实 CreativePlan 生成任务状态。
      </Typography.Text>
    </div>
  );
}
