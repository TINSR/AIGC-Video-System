import { ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Row, Space, Spin, Table, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CreativePlan, GenerationTask, Material, Product } from "@clipshop/shared";
import { api } from "../services/api";

type PlanMap = Record<string, CreativePlan[]>;
type MaterialMap = Record<string, Material[]>;

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
  const [materialsByProduct, setMaterialsByProduct] = useState<MaterialMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;

    async function loadWorkspace() {
      const [nextProducts, nextTasks] = await Promise.all([api.getProducts(), api.getTasks()]);
      const [planEntries, materialEntries] = await Promise.all([
        Promise.all(nextProducts.map(async (product) => [product.id, await api.getCreativePlans(product.id)] as const)),
        Promise.all(
          nextProducts.map(async (product) => [product.id, await api.getMaterials(product.id).catch(() => [])] as const)
        )
      ]);

      if (!alive) return;
      setProducts(nextProducts);
      setTasks(nextTasks);
      setPlansByProduct(Object.fromEntries(planEntries));
      setMaterialsByProduct(Object.fromEntries(materialEntries));
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
          const productMaterials = materialsByProduct[product.id] ?? [];
          const latestPlan = latestByTime(plans);
          const latestTask = latestTasksByProduct[product.id];
          let statusText = "无素材：等待上传素材";
          let primaryLink = `/products/${product.id}/materials`;
          let primaryText = "上传素材";

          if (productMaterials.length > 0 && !latestPlan) {
            statusText = `已有 ${productMaterials.length} 个素材：等待生成方案`;
            primaryLink = `/products/${product.id}/creative-plan`;
            primaryText = "生成方案";
          }
          if (latestPlan) {
            statusText = latestPlan.status === "approved" ? "方案已审核：等待生成视频" : `方案${latestPlan.status}：等待审核`;
            primaryLink = `/creative-plans/${latestPlan.id}/review`;
            primaryText = latestPlan.status === "approved" ? "生成视频" : "审核方案";
          }
          if (latestTask) {
            if (latestTask.status === "success" && latestTask.outputVideoUrl) {
              statusText = "渲染成功：可查看成片";
              primaryLink = `/videos/${latestTask.id}`;
              primaryText = "查看成片";
            } else if (latestTask.status === "failed") {
              statusText = "渲染失败：查看失败原因 / 重试";
              primaryLink = `/tasks/${latestTask.id}`;
              primaryText = "查看失败原因";
            } else {
              statusText = `渲染中：${latestTask.progress}%`;
              primaryLink = `/tasks/${latestTask.id}`;
              primaryText = "查看进度";
            }
          }

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
                <Typography.Text type="secondary">
                  下一步：{primaryText} · 素材 {productMaterials.length} 个 · 方案 {plans.length} 个
                </Typography.Text>
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
