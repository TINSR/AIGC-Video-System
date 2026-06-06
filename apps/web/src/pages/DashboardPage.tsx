import { ArrowRightOutlined, PlusOutlined, VideoCameraOutlined, ScissorOutlined, DeleteOutlined, MoreOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Dropdown, Empty, Modal, Row, Space, Spin, Table, Tag, Tooltip, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CreativePlan, GenerationTask, Material, Product, WorkspaceCreativePlanSummary } from "@clipshop/shared";
import { api, type WorkspaceTaskSummary } from "../services/api";

type PlanMap = Record<string, Array<CreativePlan | WorkspaceCreativePlanSummary>>;
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

function nextActionLabel(action?: WorkspaceTaskSummary["nextAction"]) {
  const labels: Record<WorkspaceTaskSummary["nextAction"], string> = {
    upload_material: "上传素材",
    generate_plan: "生成方案",
    review_plan: "审核方案",
    render_video: "生成视频",
    view_task: "查看进度",
    view_video: "查看成片",
    retry: "查看失败原因 / 重试"
  };
  return action ? labels[action] : undefined;
}

export function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [plansByProduct, setPlansByProduct] = useState<PlanMap>({});
  const [materialsByProduct, setMaterialsByProduct] = useState<MaterialMap>({});
  const [workspaceSummaries, setWorkspaceSummaries] = useState<WorkspaceTaskSummary[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    let alive = true;

    async function loadWorkspace() {
      try {
        const summaries = await api.getWorkspaceTasks();
        if (!alive) return;
        setWorkspaceSummaries(summaries);
        setProducts(summaries.map((summary) => summary.product));
        setTasks(summaries.flatMap((summary) => (summary.latestTask ? [summary.latestTask] : [])));
        setPlansByProduct(
          Object.fromEntries(
            summaries.map((summary) => [summary.product.id, summary.latestPlan ? [summary.latestPlan] : []])
          )
        );
        setMaterialsByProduct(
          Object.fromEntries(
            summaries.map((summary) => [
              summary.product.id,
              Array.from({ length: summary.materialsCount }, (_, index) => ({
                id: `${summary.product.id}-material-count-${index}`,
                productId: summary.product.id,
                type: "image" as const,
                fileUrl: "",
                title: "",
                tags: [],
                createdAt: summary.product.createdAt
              }))
            ])
          )
        );
        setError(undefined);
        return;
      } catch {
        if (!alive) return;
      }

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
      setWorkspaceSummaries(undefined);
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

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    const latestTask = latestTasksByProduct[productToDelete.id];
    if (latestTask && (latestTask.status === "running" || latestTask.status === "pending")) {
      messageApi.warning("该商品有正在渲染中的任务，建议等待任务完成后再删除");
      setDeleteModalOpen(false);
      setProductToDelete(null);
      return;
    }

    setDeletingProductId(productToDelete.id);
    try {
      await api.deleteProduct(productToDelete.id);
      messageApi.success("商品任务已删除");
      // 重新加载工作台数据
      window.location.reload();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : "删除失败，请稍后重试");
    } finally {
      setDeletingProductId(null);
      setDeleteModalOpen(false);
      setProductToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setProductToDelete(null);
  };

  if (loading) return <Spin fullscreen />;

  return (
    <Space direction="vertical" size={24} className="full-width">
      {contextHolder}
      <section className="studio-hero">
        <div className="hero-copy">
          <Typography.Text type="secondary">Commerce video creation</Typography.Text>
          <Typography.Title>商品视频任务工作台</Typography.Title>
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
          <div className="prompt-input">从商品素材到创意方案，再到视频成片，全流程集中管理。</div>
          <div className="console-strip">
            <img src="https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=400&q=80" alt="product material" />
            <img src="https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=400&q=80" alt="drink material" />
            <img src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80" alt="scene material" />
          </div>
        </div>
      </section>

      {error ? <Alert type="error" showIcon message={error} /> : null}
      {products.length === 0 ? (
        <div className="surface">
          <Empty description="暂无商品任务，创建商品后即可开始视频创作。" />
        </div>
      ) : (
        <Row gutter={[20, 20]}>
          {products.map((product) => {
            const summary = workspaceSummaries?.find((item) => item.product.id === product.id);
            const plans = plansByProduct[product.id] ?? [];
            const productMaterials = materialsByProduct[product.id] ?? [];
            const latestPlan = summary?.latestPlan ?? latestByTime(plans);
            const latestTask = summary?.latestTask ?? latestTasksByProduct[product.id];
            const materialsCount = summary?.materialsCount ?? productMaterials.length;
            const creativePlansCount = summary?.creativePlansCount ?? plans.length;
            let statusText = "无素材：等待上传素材";
            let primaryLink = `/products/${product.id}/materials`;
            let primaryText = "上传素材";

            if (materialsCount > 0 && !latestPlan) {
              statusText = `已有 ${materialsCount} 个素材：等待生成方案`;
              primaryLink = `/products/${product.id}/creative-plan`;
              primaryText = "生成方案";
            }
            if (latestPlan) {
              statusText =
                latestPlan.status === "approved" ? "方案已审核：等待生成视频" : `方案${latestPlan.status}：等待审核`;
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
            const actionLabel = nextActionLabel(summary?.nextAction) ?? primaryText;

            // 判断创作模式可用性
            const hasMaterials = materialsCount > 0;
            const hasPlan = !!latestPlan;
            const canUseSeedance = hasMaterials && hasPlan;
            const canUseSmartClip = hasMaterials && hasPlan;

            // 智能剪辑不可用的原因
            const smartClipDisabledReason = !hasMaterials
              ? "请先上传图片或视频素材"
              : !hasPlan
                ? "请先生成方案，智能剪辑需要分镜作为剪辑依据"
                : "";

            // Seedance不可用的原因
            const seedanceDisabledReason = !hasMaterials
              ? "请先上传图片或视频素材"
              : !hasPlan
                ? "请先生成方案"
                : "";

            return (
              <Col xs={24} lg={12} key={product.id}>
                <article className="product-card">
                  <div className="card-header">
                    <Space wrap>
                      <Typography.Text type="secondary">{product.category}</Typography.Text>
                      <Tag color={latestTask ? taskStatusColor(latestTask.status) : latestPlan ? "blue" : "default"}>
                        {statusText}
                      </Tag>
                    </Space>
                    <Tooltip title="删除商品任务">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deletingProductId === product.id}
                        onClick={() => handleDeleteClick(product)}
                        size="small"
                      />
                    </Tooltip>
                  </div>
                  <Typography.Title level={3}>{product.title}</Typography.Title>
                  <Typography.Paragraph>{product.usageScene}</Typography.Paragraph>
                  <Typography.Text type="secondary">
                    下一步：{actionLabel} · 素材 {materialsCount} 个 · 方案 {creativePlansCount} 个
                  </Typography.Text>
                  <Space wrap>
                    {product.sellingPoints.map((point) => (
                      <Tag key={point}>{point}</Tag>
                    ))}
                  </Space>

                  {/* 创作模式入口 */}
                  <div className="creation-mode-actions">
                    <Tooltip title={seedanceDisabledReason || "使用审核后的脚本和商品首帧图，提交 Seedance 生成完整 AI 视频"}>
                      <Link to={canUseSeedance ? `/creative-plans/${latestPlan!.id}/review?mode=seedance` : primaryLink}>
                        <Button
                          type="primary"
                          icon={<VideoCameraOutlined />}
                          disabled={!canUseSeedance}
                        >
                          AI 生成视频
                        </Button>
                      </Link>
                    </Tooltip>
                    <Tooltip title={smartClipDisabledReason || "使用商家上传的真实图片/视频素材，系统会自动切片、匹配分镜并剪辑成片"}>
                      <Link to={canUseSmartClip ? `/creative-plans/${latestPlan!.id}/review?mode=smart-edit` : primaryLink}>
                        <Button
                          icon={<ScissorOutlined />}
                          disabled={!canUseSmartClip}
                        >
                          素材智能剪辑
                        </Button>
                      </Link>
                    </Tooltip>
                  </div>

                  <Space wrap className="card-actions">
                    <Link to={primaryLink}>
                      <Button type="primary">{actionLabel}</Button>
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
      )}

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

      <Modal
        title="确认删除商品任务"
        open={deleteModalOpen}
        onOk={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmLoading={deletingProductId === productToDelete?.id}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确认删除该商品任务？</p>
        <p>删除后将移除商品及关联数据，此操作不可撤销。</p>
        {productToDelete && latestTasksByProduct[productToDelete.id]?.status === "running" && (
          <Alert
            type="warning"
            showIcon
            message="该商品有正在渲染中的任务，建议等待任务完成后再删除"
          />
        )}
      </Modal>
    </Space>
  );
}
