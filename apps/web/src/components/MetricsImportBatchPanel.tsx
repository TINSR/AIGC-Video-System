import { Alert, Empty, List, Space, Tag, Typography } from "antd";
import type { MetricsImportBatch } from "../services/api";

type Props = {
  batches: MetricsImportBatch[];
  loading?: boolean;
};

export function MetricsImportBatchPanel({ batches, loading }: Props) {
  return (
    <div className="surface">
      <Space direction="vertical" size={14} className="full-width">
        <div>
          <Typography.Text type="secondary">Import Quality</Typography.Text>
          <Typography.Title level={4}>最近导入批次</Typography.Title>
        </div>
        {batches.length === 0 && !loading ? <Empty description="暂无导入批次" /> : null}
        <List
          loading={loading}
          dataSource={batches.slice(0, 5)}
          renderItem={(batch) => (
            <List.Item>
              <Space direction="vertical" size={8} className="full-width">
                <Space wrap>
                  <Tag color={batch.source === "mock_seed" ? "blue" : "green"}>{batch.source}</Tag>
                  {batch.fileName ? <Tag>{batch.fileName}</Tag> : null}
                  <Typography.Text type="secondary">{new Date(batch.createdAt).toLocaleString()}</Typography.Text>
                </Space>
                <Typography.Text>
                  acceptedRows {batch.acceptedRows} / rejectedRows {batch.rejectedRows} / totalRows {batch.totalRows}
                </Typography.Text>
                {batch.errors.length > 0 ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="错误行预览"
                    description={batch.errors.slice(0, 20).map((error) => (
                      <div key={`${batch.id}_${error.row}`}>
                        第 {error.row} 行：{error.message}
                      </div>
                    ))}
                  />
                ) : null}
              </Space>
            </List.Item>
          )}
        />
      </Space>
    </div>
  );
}
