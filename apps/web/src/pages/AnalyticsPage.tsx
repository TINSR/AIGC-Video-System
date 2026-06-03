import ReactECharts from "echarts-for-react";
import { Alert, Button, Col, Empty, Row, Segmented, Select, Space, Spin, Typography, message } from "antd";
import { ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnalyticsMetricCard } from "../components/AnalyticsMetricCard";
import { MetricsCsvImportModal } from "../components/MetricsCsvImportModal";
import { MetricsImportBatchPanel } from "../components/MetricsImportBatchPanel";
import { TemplatePerformanceComparePanel } from "../components/TemplatePerformanceComparePanel";
import { TemplatePerformanceTable } from "../components/TemplatePerformanceTable";
import {
  api,
  type AnalyticsOverview,
  type CommerceMetricsPlatform,
  type MetricsImportBatch,
  type TemplatePerformanceComparison,
  type TemplatePerformanceSummary,
  type VideoPerformanceMetric
} from "../services/api";

type RangeDays = 7 | 30;

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function summarizeMetrics(metrics: VideoPerformanceMetric[], templatePerformance: TemplatePerformanceSummary[]): AnalyticsOverview {
  const totalPlays = metrics.reduce((sum, item) => sum + item.plays, 0);
  const totalClicks = metrics.reduce((sum, item) => sum + item.clicks, 0);
  const totalConversions = metrics.reduce((sum, item) => sum + item.conversions, 0);
  const dailyMap = new Map<string, { date: string; plays: number; clicks: number; conversions: number }>();

  metrics.forEach((metric) => {
    const date = metric.collectedAt.slice(0, 10);
    const current = dailyMap.get(date) ?? { date, plays: 0, clicks: 0, conversions: 0 };
    current.plays += metric.plays;
    current.clicks += metric.clicks;
    current.conversions += metric.conversions;
    dailyMap.set(date, current);
  });

  return {
    totalPlays,
    totalClicks,
    totalConversions,
    clickRate: percent(totalClicks, totalPlays),
    conversionRate: percent(totalConversions, totalClicks),
    averageWatchRate: Number(
      (metrics.reduce((sum, item) => sum + item.averageWatchRate, 0) / Math.max(metrics.length, 1)).toFixed(2)
    ),
    dailyTrend: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    templatePerformance
  };
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview>();
  const [metrics, setMetrics] = useState<VideoPerformanceMetric[]>([]);
  const [templatePerformance, setTemplatePerformance] = useState<TemplatePerformanceSummary[]>([]);
  const [batches, setBatches] = useState<MetricsImportBatch[]>([]);
  const [comparison, setComparison] = useState<TemplatePerformanceComparison>();
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [platform, setPlatform] = useState<CommerceMetricsPlatform | undefined>();
  const [days, setDays] = useState<RangeDays>(7);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [compareError, setCompareError] = useState<string>();
  const [importError, setImportError] = useState<string>();

  const latestBatch = batches[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [metricsData, performanceData, batchData] = await Promise.all([
        api.getMetrics({ platform, days }),
        api.getTemplatePerformance(),
        api.getMetricsImportBatches()
      ]);
      const filteredTemplateIds = new Set(metricsData.map((item) => item.templateId).filter(Boolean));
      const filteredPerformance = performanceData.filter(
        (item) => !item.templateId || filteredTemplateIds.has(item.templateId)
      );
      setMetrics(metricsData);
      setTemplatePerformance(filteredPerformance);
      setBatches(batchData);
      setOverview(summarizeMetrics(metricsData, filteredPerformance));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载数据看板失败");
    } finally {
      setLoading(false);
    }
  }, [days, platform]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const trend = overview?.dailyTrend ?? [];
  const metricCards = useMemo(
    () => [
      { title: "总播放", value: overview?.totalPlays ?? 0 },
      { title: "总点击", value: overview?.totalClicks ?? 0 },
      { title: "总转化", value: overview?.totalConversions ?? 0 },
      { title: "点击率", value: overview?.clickRate ?? 0, suffix: "%" },
      { title: "转化率", value: overview?.conversionRate ?? 0, suffix: "%" },
      { title: "平均完播率", value: overview?.averageWatchRate ?? 0, suffix: "%" }
    ],
    [overview]
  );

  const handleSeed = async () => {
    setActionLoading(true);
    try {
      await api.seedMockMetrics();
      message.success("演示指标已初始化");
      await loadData();
    } catch (err) {
      message.warning(err instanceof Error ? err.message : "初始化演示数据失败");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    setActionLoading(true);
    try {
      await api.resetMockMetrics();
      setComparison(undefined);
      setSelectedTemplateIds([]);
      message.success("演示指标已重置");
      await loadData();
    } catch (err) {
      message.warning(err instanceof Error ? err.message : "重置演示数据失败");
    } finally {
      setActionLoading(false);
    }
  };

  const handleImport = async (file: File) => {
    setImportLoading(true);
    setImportError(undefined);
    try {
      await api.importMetricsCsv(file);
      await loadData();
      message.success("CSV 导入完成");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "CSV 导入失败");
    } finally {
      setImportLoading(false);
    }
  };

  const handleCompare = async () => {
    if (selectedTemplateIds.length !== 2) return;
    setCompareLoading(true);
    setCompareError(undefined);
    try {
      setComparison(await api.compareTemplatePerformance(selectedTemplateIds[0], selectedTemplateIds[1]));
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : "模板对比失败");
    } finally {
      setCompareLoading(false);
    }
  };

  if (loading && !overview) return <Spin fullscreen />;

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Day14 Analytics Feedback</Typography.Text>
          <Typography.Title level={2}>模板效果看板</Typography.Title>
        </div>
        <Space wrap>
          <Select
            allowClear
            placeholder="全部平台"
            value={platform}
            style={{ width: 180 }}
            onChange={(value) => setPlatform(value)}
            options={[
              { value: "mock", label: "mock" },
              { value: "douyin_shop", label: "douyin_shop" },
              { value: "tiktok_shop", label: "tiktok_shop" }
            ]}
          />
          <Segmented
            value={days}
            onChange={(value) => setDays(value as RangeDays)}
            options={[
              { label: "最近 7 天", value: 7 },
              { label: "最近 30 天", value: 30 }
            ]}
          />
          <Button loading={actionLoading} onClick={handleSeed}>
            初始化演示数据
          </Button>
          <Button loading={actionLoading} onClick={handleReset}>
            重置演示数据
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
            导入 CSV
          </Button>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={loadData}>
            刷新
          </Button>
        </Space>
      </section>
      {error ? <Alert type="warning" showIcon message="数据看板暂不可用" description={error} /> : null}
      <Row gutter={[16, 16]}>
        {metricCards.map((card) => (
          <Col xs={24} sm={12} xl={4} key={card.title}>
            <AnalyticsMetricCard title={card.title} value={card.value} suffix={card.suffix} />
          </Col>
        ))}
      </Row>
      <div className="surface">
        <div className="strategy-heading">
          <div>
            <Typography.Text type="secondary">7 Day Trend</Typography.Text>
            <Typography.Title level={4}>播放 / 点击 / 转化趋势</Typography.Title>
          </div>
          <Typography.Text type="secondary">当前样本 {metrics.length} 条</Typography.Text>
        </div>
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
          <Empty description="暂无趋势数据，可初始化演示数据或导入 CSV。" />
        )}
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <div className="surface">
            <Space direction="vertical" size={14} className="full-width">
              <div>
                <Typography.Text type="secondary">Template Performance</Typography.Text>
                <Typography.Title level={4}>模板效果排行</Typography.Title>
              </div>
              <TemplatePerformanceTable
                data={templatePerformance}
                loading={loading}
                selectedTemplateIds={selectedTemplateIds}
                onSelect={(ids) => {
                  setSelectedTemplateIds(ids);
                  setComparison(undefined);
                }}
              />
            </Space>
          </div>
        </Col>
        <Col xs={24} xl={8}>
          <TemplatePerformanceComparePanel
            selectedCount={selectedTemplateIds.length}
            comparison={comparison}
            loading={compareLoading}
            error={compareError}
            onCompare={handleCompare}
          />
        </Col>
      </Row>
      <MetricsImportBatchPanel batches={batches} loading={loading} />
      <MetricsCsvImportModal
        open={importOpen}
        loading={importLoading}
        latestBatch={latestBatch}
        error={importError}
        onImport={handleImport}
        onClose={() => setImportOpen(false)}
      />
    </Space>
  );
}
