import ReactECharts from "echarts-for-react";
import { Col, Row, Space, Typography } from "antd";
import { analyticsOverview } from "../data/mockData";
import { AbTestCompareChart } from "../components/AbTestCompareChart";
import { AnalyticsMetricCard } from "../components/AnalyticsMetricCard";

export function AnalyticsPage() {
  const trend = analyticsOverview.dailyTrend;

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">P1 Mock Analytics</Typography.Text>
          <Typography.Title level={2}>数据看板</Typography.Title>
        </div>
      </section>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <AnalyticsMetricCard title="总播放" value={analyticsOverview.totalPlays} />
        </Col>
        <Col xs={24} md={6}>
          <AnalyticsMetricCard title="点击" value={analyticsOverview.totalClicks} />
        </Col>
        <Col xs={24} md={6}>
          <AnalyticsMetricCard title="转化率" value={analyticsOverview.conversionRate} suffix="%" />
        </Col>
        <Col xs={24} md={6}>
          <AnalyticsMetricCard title="平均完播" value={analyticsOverview.averageWatchRate} suffix="%" />
        </Col>
      </Row>
      <div className="surface">
        <ReactECharts
          className="chart"
          option={{
            tooltip: { trigger: "axis" },
            legend: { textStyle: { color: "#c7c8d8" } },
            grid: { left: 40, right: 24, top: 48, bottom: 32 },
            xAxis: { type: "category", data: trend.map((item) => item.date), axisLabel: { color: "#c7c8d8" } },
            yAxis: { type: "value", axisLabel: { color: "#c7c8d8" }, splitLine: { lineStyle: { color: "#26283a" } } },
            series: [
              { name: "播放", type: "line", smooth: true, data: trend.map((item) => item.plays), color: "#37d5ff" },
              { name: "点击", type: "line", smooth: true, data: trend.map((item) => item.clicks), color: "#7c5cff" },
              { name: "转化", type: "line", smooth: true, data: trend.map((item) => item.conversions), color: "#ffcc66" }
            ]
          }}
        />
      </div>
      <div className="surface">
        <Typography.Title level={4}>A/B 对比</Typography.Title>
        <AbTestCompareChart data={analyticsOverview.abTests} />
      </div>
    </Space>
  );
}
