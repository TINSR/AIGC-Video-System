import ReactECharts from "echarts-for-react";
import { Alert, Col, Empty, Row, Space, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import type { AnalyticsOverview } from "@clipshop/shared";
import { AbTestCompareChart } from "../components/AbTestCompareChart";
import { AnalyticsMetricCard } from "../components/AnalyticsMetricCard";
import { api } from "../services/api";

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    api
      .getAnalytics()
      .then((data) => {
        if (alive) setOverview(data);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "加载数据看板失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <Spin fullscreen />;

  const trend = overview?.dailyTrend ?? [];
  const abTests = overview?.abTests ?? [];

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">P1 Analytics</Typography.Text>
          <Typography.Title level={2}>数据看板</Typography.Title>
        </div>
      </section>
      {error ? <Alert type="warning" showIcon message={error} /> : null}
      {overview ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <AnalyticsMetricCard title="总播放" value={overview.totalPlays} />
          </Col>
          <Col xs={24} md={6}>
            <AnalyticsMetricCard title="点击" value={overview.totalClicks} />
          </Col>
          <Col xs={24} md={6}>
            <AnalyticsMetricCard title="转化率" value={overview.conversionRate} suffix="%" />
          </Col>
          <Col xs={24} md={6}>
            <AnalyticsMetricCard title="平均完播" value={overview.averageWatchRate} suffix="%" />
          </Col>
        </Row>
      ) : null}
      <div className="surface">
        {trend.length > 0 ? (
          <ReactECharts
            className="chart"
            option={{
              tooltip: { trigger: "axis" },
              legend: { textStyle: { color: "#c7c8d8" } },
              grid: { left: 40, right: 24, top: 48, bottom: 32 },
              xAxis: { type: "category", data: trend.map((item) => item.date), axisLabel: { color: "#c7c8d8" } },
              yAxis: {
                type: "value",
                axisLabel: { color: "#c7c8d8" },
                splitLine: { lineStyle: { color: "#26283a" } }
              },
              series: [
                { name: "播放", type: "line", smooth: true, data: trend.map((item) => item.plays), color: "#37d5ff" },
                { name: "点击", type: "line", smooth: true, data: trend.map((item) => item.clicks), color: "#7c5cff" },
                {
                  name: "转化",
                  type: "line",
                  smooth: true,
                  data: trend.map((item) => item.conversions),
                  color: "#ffcc66"
                }
              ]
            }}
          />
        ) : (
          <Empty description="暂无趋势数据" />
        )}
      </div>
      <div className="surface">
        <Typography.Title level={4}>A/B 对比</Typography.Title>
        {abTests.length > 0 ? <AbTestCompareChart data={abTests} /> : <Empty description="暂无 A/B 测试数据" />}
      </div>
    </Space>
  );
}
