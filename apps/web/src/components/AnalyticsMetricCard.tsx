import { ArrowUpOutlined } from "@ant-design/icons";
import { Card, Statistic } from "antd";

type Props = {
  title: string;
  value: number;
  suffix?: string;
};

export function AnalyticsMetricCard({ title, value, suffix }: Props) {
  return (
    <Card className="metric-card">
      <Statistic
        title={title}
        value={value}
        suffix={suffix}
        prefix={<ArrowUpOutlined />}
        valueStyle={{ color: "#ffffff" }}
      />
    </Card>
  );
}
