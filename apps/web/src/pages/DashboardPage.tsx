import { ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Row, Space, Spin, Table, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CreativePlan, GenerationTask, Product } from "@clipshop/shared";
import { api } from "../services/api";

type PlanMap = Record<string, CreativePlan[]>;

function taskStatusColor(status: GenerationTask["status"]) {
  if (status === "success") return "green";
  if (status === "failed") return "red";
  return "blue";
}

function latestByTime<T extends { createdAt: string; updatedAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt ?? a.createdAt);
    const bTime = Date.parse(b.updatedAt ?? b.createdAt);
    return bTime - aTime;
  })[0];
}

export function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [plansByProduct, setPlansByProduct] = useState<PlanMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;

    async function loadWorkspace() {
      const [nextProducts, nextTasks] = await Promise.all([api.getProducts(), api.getTasks()]);
      const planEntries = await Promise.all(
        nextProducts.map(async (product) => [product.id, await api.getCreativePlans(product.id)] as const)
      );

      if (!alive) return;
      setProducts(nextProducts);
      setTasks(nextTasks);
      setPlansByProduct(Object.fromEntries(planEntries));
      setError(undefined);
    }

    loadWorkspace()
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "加载工作台失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const latestTasksByProduct = useMemo(() => {
    const grouped: Record<string, GenerationTask[]> = {};
    for (const task of tasks) {
      grouped[task.productId] = [...(grouped[task.productId] ?? []), task];
    }
    return Object.fromEntries(Object.entries(grouped).map(([productId, productTasks]) => [productId, latestByTime(productTasks)]));
  }, [tasks]);

  if (loading) return <Spin fullscreen />;

  return (
    <Space direction="vertical" size={24} className="full-width">
      <section className="studio-hero">
        <div className="hero-copy">
          <Typography.Text type="secondary">Commerce video creation</Typography.Text>
          <Typography.Title>创作工作台</Typography.Title>
          <Typography.Paragraph>
            每个商品都是一个可恢复的创作任务。刷新页面后，可以从商品继续上传素材、审核方案、查看渲染进度或打开成片。
          </Typography.Paragraph>
          <Space wrap>
            <Link to="/products/new">
              <Button type="primary" size="large" icon={<PlusOutlined />}>
                创建商品任务
              </Button>
            </Link>
            {products[0] ? (
              <Link to={`/products/${products[0].id}/creative-plan`}>
                <Button size="large" icon={<ArrowRightOutlined />}>
                  继续最近任务
                </Button>
              </Link>
            ) : null}
          </Space>
        </div>
        <div className="prompt-console">
          <div className="console-tabs">
            <Tag color="purple">视频生成</Tag>
            <Tag>方案审核</Tag>
            <Tag>任务恢复</Tag>
          </div>
          <div className="prompt-input">Product → CreativePlan → RenderTask 都从真实 API 恢复，不再依赖刷新前的页面状态。</div>
          <div className="console-strip">
            <img src="https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=400&q=80" alt="product material" />
            <img src="https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=400&q=80" alt="drink material" />
            <img src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80" alt="scene material" />
          </div>
        </div>
      </section>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Row gutter={[20, 20]}>
        {products.map((product) => {
          const plans = plansByProduct[product.id] ?? [];
          const latestPlan = latestByTime(plans);
          const latestTask = latestTasksByProduct[product.id];
          const statusText = latestTask
            ? `渲染任务：${latestTask.status}，${latestTask.progress}%`
            : latestPlan
              ? `已有方案：${latestPlan.status}`
              : "已创建商品，等待素材和方案";
          const primaryLink = latestTask
            ? latestTask.status === "success" && latestTask.outputVideoUrl
              ? `/videos/${latestTask.id}`
              : `/tasks/${latestTask.id}`
            : latestPlan
              ? `/creative-plans/${latestPlan.id}/review`
              : `/products/${product.id}/materials`;
          const primaryText = latestTask
            ? latestTask.status === "success"
              ? "查看成片"
              : "查看任务"
            : latestPlan
              ? "继续审核"
              : "上传素材";

          return (
            <Col xs={24} lg={12} key={product.id}>
              <article className="product-card">
                <Space wrap>
                  <Typography.Text type="secondary">{product.category}</Typography.Text>
                  <Tag color={latestTask ? taskStatusColor(latestTask.status) : latestPlan ? "blue" : "default"}>
                    {statusText}
                  </Tag>
                </Space>
                <Typography.Title level={3}>{product.title}</Typography.Title>
                <Typography.Paragraph>{product.usageScene}</Typography.Paragraph>
                <Space wrap>
                  {product.sellingPoints.map((point) => (
                    <Tag key={point}>{point}</Tag>
                  ))}
                </Space>
                <Space wrap className="card-actions">
                  <Link to={primaryLink}>
                    <Button type="primary">{primaryText}</Button>
                  </Link>
                  <Link to={`/products/${product.id}/materials`}>
                    <Button>素材库</Button>
                  </Link>
                  <Link to={`/products/${product.id}/creative-plan`}>
                    <Button>方案列表</Button>
                  </Link>
                </Space>
              </article>
            </Col>
          );
        })}
      </Row>

      <Table
        className="surface"
        rowKey="id"
        pagination={{ pageSize: 8 }}
        dataSource={tasks}
        columns={[
          { title: "渲染任务", dataIndex: "id", ellipsis: true },
          {
            title: "状态",
            dataIndex: "status",
            render: (status: GenerationTask["status"]) => <Tag color={taskStatusColor(status)}>{status}</Tag>,
          },
          { title: "当前步骤", dataIndex: "currentStep", ellipsis: true },
          { title: "进度", dataIndex: "progress", render: (progress: number) => `${progress}%` },
          {
            title: "操作",
            render: (_: unknown, record: GenerationTask) => (
              <Space>
                <Link to={`/tasks/${record.id}`}>任务详情</Link>
                {record.status === "success" && record.outputVideoUrl ? <Link to={`/videos/${record.id}`}>查看成片</Link> : null}
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );
}
