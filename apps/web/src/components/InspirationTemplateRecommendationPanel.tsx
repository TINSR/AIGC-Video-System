import { Alert, Button, Empty, Space, Tag, Typography } from "antd";
import type { InspirationTemplateRecommendation } from "@clipshop/shared";

type Props = {
  recommendations: InspirationTemplateRecommendation[];
  selectedTemplateId?: string;
  loading?: boolean;
  error?: string;
  onSelect: (templateId?: string) => void;
};

export function InspirationTemplateRecommendationPanel({
  recommendations,
  selectedTemplateId,
  loading,
  error,
  onSelect
}: Props) {
  return (
    <div className="surface recommendation-panel">
      <Space direction="vertical" size={14} className="full-width">
        <div className="strategy-heading">
          <div>
            <Typography.Text type="secondary">Template Recommendation</Typography.Text>
            <Typography.Title level={3}>灵感模板推荐</Typography.Title>
          </div>
          {selectedTemplateId ? <Button onClick={() => onSelect(undefined)}>不使用模板</Button> : null}
        </div>
        {error ? (
          <Alert
            type="warning"
            showIcon
            message="模板推荐暂不可用"
            description={`${error}。你仍然可以不选择模板直接生成。`}
          />
        ) : null}
        {!loading && recommendations.length === 0 ? <Empty description="暂无推荐模板，可直接生成 CreativePlan。" /> : null}
        {recommendations.map(({ template, score, reasons }) => {
          const selected = template.id === selectedTemplateId;
          return (
            <button
              className={`template-recommendation ${selected ? "selected" : ""}`}
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
            >
              <Space direction="vertical" size={8} className="full-width">
                <Space wrap>
                  <Tag color={selected ? "green" : "blue"}>{selected ? "已选择" : "可选择"}</Tag>
                  <Tag color="purple">score {score}</Tag>
                  {template.category ? <Tag>{template.category}</Tag> : null}
                </Space>
                <Typography.Text strong>{template.name}</Typography.Text>
                <Typography.Paragraph ellipsis={{ rows: 2 }}>{template.strategy}</Typography.Paragraph>
                <Space wrap>
                  {reasons.map((reason) => (
                    <Tag key={reason}>{reason}</Tag>
                  ))}
                </Space>
              </Space>
            </button>
          );
        })}
      </Space>
    </div>
  );
}

