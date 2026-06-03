import { Alert, Button, Empty, Space, Tag, Typography } from "antd";
import type { TemplatePerformanceComparison } from "../services/api";

type Props = {
  selectedCount: number;
  comparison?: TemplatePerformanceComparison;
  loading?: boolean;
  error?: string;
  onCompare: () => void;
};

export function TemplatePerformanceComparePanel({ selectedCount, comparison, loading, error, onCompare }: Props) {
  return (
    <div className="surface">
      <Space direction="vertical" size={14} className="full-width">
        <div className="strategy-heading">
          <div>
            <Typography.Text type="secondary">Template Compare</Typography.Text>
            <Typography.Title level={4}>模板双选对比</Typography.Title>
          </div>
          <Button type="primary" loading={loading} disabled={selectedCount !== 2} onClick={onCompare}>
            对比
          </Button>
        </div>
        {error ? <Alert type="warning" showIcon message="模板对比失败" description={error} /> : null}
        {!comparison ? <Empty description="在模板效果排行中选择两条模板后对比。" /> : null}
        {comparison ? (
          <Space direction="vertical" size={10} className="full-width">
            <Space wrap>
              <Tag color={comparison.winnerTemplateId === comparison.left.templateId ? "green" : "blue"}>
                {comparison.left.templateName}：{comparison.left.score}
              </Tag>
              <Tag color={comparison.winnerTemplateId === comparison.right.templateId ? "green" : "blue"}>
                {comparison.right.templateName}：{comparison.right.score}
              </Tag>
            </Space>
            {comparison.reasons.map((reason) => (
              <Typography.Text key={reason}>{reason}</Typography.Text>
            ))}
          </Space>
        ) : null}
      </Space>
    </div>
  );
}
