import { CheckCircleFilled } from "@ant-design/icons";
import { Radio, Space, Typography } from "antd";
import type { ScriptStyle } from "@clipshop/shared";

const templates: Array<{ value: ScriptStyle; title: string; desc: string }> = [
  { value: "pain_point", title: "痛点转化", desc: "先戳需求，再用商品解决" },
  { value: "review", title: "测评种草", desc: "模拟真实体验与对比" },
  { value: "scenario", title: "场景故事", desc: "用生活场景带出卖点" },
  { value: "discount", title: "优惠促单", desc: "突出限时利益点" },
  { value: "premium", title: "质感品牌", desc: "慢节奏、强调品质" }
];

type Props = {
  value: ScriptStyle;
  onChange: (value: ScriptStyle) => void;
};

export function StyleTemplateSelector({ value, onChange }: Props) {
  return (
    <Radio.Group value={value} onChange={(event) => onChange(event.target.value)}>
      <div className="template-grid">
        {templates.map((template) => (
          <Radio.Button key={template.value} value={template.value} className="template-option">
            <Space align="start">
              {value === template.value ? <CheckCircleFilled /> : <span className="empty-check" />}
              <span>
                <Typography.Text strong>{template.title}</Typography.Text>
                <Typography.Text type="secondary">{template.desc}</Typography.Text>
              </span>
            </Space>
          </Radio.Button>
        ))}
      </div>
    </Radio.Group>
  );
}
