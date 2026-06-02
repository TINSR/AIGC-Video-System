import { Button, Space, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import type { InspirationTemplate } from "@clipshop/shared";

type Props = {
  template: InspirationTemplate;
};

const sourceModeCopy: Record<InspirationTemplate["sourceMode"], string> = {
  built_in: "内置模板",
  rule_generated: "规则归纳",
  manual: "人工维护"
};

export function InspirationTemplateCard({ template }: Props) {
  return (
    <article className="template-card">
      <Space direction="vertical" size={12} className="full-width">
        <Space wrap>
          <Tag color={template.status === "active" ? "green" : "default"}>{template.status}</Tag>
          <Tag color="purple">{sourceModeCopy[template.sourceMode]}</Tag>
          {template.category ? <Tag color="blue">{template.category}</Tag> : null}
        </Space>
        <div>
          <Typography.Title level={4}>{template.name}</Typography.Title>
          <Typography.Paragraph ellipsis={{ rows: 2 }}>{template.description}</Typography.Paragraph>
        </div>
        <div className="template-meta-grid">
          <span>策略</span>
          <Typography.Text>{template.strategy}</Typography.Text>
          <span>Hook</span>
          <Typography.Text>{template.hookType}</Typography.Text>
          <span>风格</span>
          <Typography.Text>{template.style}</Typography.Text>
          <span>来源视频</span>
          <Typography.Text>{template.referenceVideoIds.length}</Typography.Text>
        </div>
        <Space wrap>
          {template.factors.slice(0, 4).map((factor) => (
            <Tag key={factor}>{factor}</Tag>
          ))}
        </Space>
        <Space wrap>
          {template.sceneGoals.slice(0, 5).map((goal) => (
            <Tag color="cyan" key={goal}>
              {goal}
            </Tag>
          ))}
        </Space>
        <Link to={`/inspiration-templates/${template.id}`}>
          <Button type="primary" block>
            查看模板详情
          </Button>
        </Link>
      </Space>
    </article>
  );
}
