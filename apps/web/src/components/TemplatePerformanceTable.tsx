import { Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TemplatePerformanceSummary } from "../services/api";

type Props = {
  data: TemplatePerformanceSummary[];
  loading?: boolean;
  selectedTemplateIds: string[];
  onSelect: (templateIds: string[]) => void;
};

export function TemplatePerformanceTable({ data, loading, selectedTemplateIds, onSelect }: Props) {
  const columns: ColumnsType<TemplatePerformanceSummary> = [
    {
      title: "模板",
      dataIndex: "templateName",
      key: "templateName",
      render: (value, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <br />
          <Typography.Text type="secondary">样本 {record.sampleCount}</Typography.Text>
        </div>
      )
    },
    { title: "播放", dataIndex: "plays", key: "plays", sorter: (a, b) => a.plays - b.plays },
    { title: "点击", dataIndex: "clicks", key: "clicks", sorter: (a, b) => a.clicks - b.clicks },
    { title: "转化", dataIndex: "conversions", key: "conversions", sorter: (a, b) => a.conversions - b.conversions },
    {
      title: "点击率",
      dataIndex: "clickRate",
      key: "clickRate",
      render: (value) => `${value}%`,
      sorter: (a, b) => a.clickRate - b.clickRate
    },
    {
      title: "转化率",
      dataIndex: "conversionRate",
      key: "conversionRate",
      render: (value) => `${value}%`,
      sorter: (a, b) => a.conversionRate - b.conversionRate
    },
    {
      title: "完播率",
      dataIndex: "averageWatchRate",
      key: "averageWatchRate",
      render: (value) => `${value}%`,
      sorter: (a, b) => a.averageWatchRate - b.averageWatchRate
    },
    {
      title: "效果分",
      dataIndex: "score",
      key: "score",
      render: (value) => <Tag color="purple">{value}</Tag>,
      sorter: (a, b) => a.score - b.score,
      defaultSortOrder: "descend"
    }
  ];

  return (
    <Table
      rowKey={(record) => record.templateId ?? "unassigned"}
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{ pageSize: 6 }}
      rowSelection={{
        selectedRowKeys: selectedTemplateIds,
        hideSelectAll: true,
        onChange(keys) {
          onSelect(keys.map(String).slice(-2));
        },
        getCheckboxProps(record) {
          const id = record.templateId ?? "unassigned";
          return {
            disabled: !record.templateId || (selectedTemplateIds.length >= 2 && !selectedTemplateIds.includes(id))
          };
        }
      }}
    />
  );
}
