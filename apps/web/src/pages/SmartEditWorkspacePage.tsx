import { PlusOutlined, ReloadOutlined, ScissorOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Empty, Row, Space, Spin, Tag, Tooltip, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type WorkspaceTaskSummary } from "../services/api";

function taskStatusColor(status: string) {
  if (status === "success") return "green";
  if (status === "failed") return "red";
  if (status === "running" || status === "pending") return "blue";
  return "default";
}

function taskStatusLabel(status: string) {
  if (status === "success") return "已完成";
  if (status === "failed") return "失败";
  if (status === "running") return "进行中";
  if (status === "pending") return "等待中";
  return status;
}

type ProductState = {
  summary: WorkspaceTaskSummary;
  hasMaterials: boolean;
  hasPlan: boolean;
  hasSmartEditTask: boolean;
  smartEditTaskStatus?: string;
  smartEditTaskId?: string;
  primaryText: string;
  primaryLink: string;
  disabledReason?: string;
};

function resolveProductState(summary: WorkspaceTaskSummary): ProductState {
  const { product, materialsCount, latestPlan, latestTask } = summary;
  const hasMaterials = materialsCount > 0;
  const hasPlan = !!latestPlan;

  const isSmartEditTask =
    latestTask && (latestTask.renderMode === "smart_clip_edit" || latestTask.provider === "smart_clip_edit");

  if (isSmartEditTask) {
    if (latestTask.status === "success" && latestTask.outputVideoUrl) {
      return {
        summary,
        hasMaterials,
        hasPlan,
        hasSmartEditTask: true,
        smartEditTaskStatus: latestTask.status,
        smartEditTaskId: latestTask.id,
        primaryText: "查看智能剪辑成片",
        primaryLink: `/videos/${latestTask.id}`,
      };
    }
    if (latestTask.status === "failed") {
      return {
        summary,
        hasMaterials,
        hasPlan,
        hasSmartEditTask: true,
        smartEditTaskStatus: latestTask.status,
        smartEditTaskId: latestTask.id,
        primaryText: "查看失败原因",
        primaryLink: `/tasks/${latestTask.id}`,
      };
    }
    return {
      summary,
      hasMaterials,
      hasPlan,
      hasSmartEditTask: true,
      smartEditTaskStatus: latestTask.status,
      smartEditTaskId: latestTask.id,
      primaryText: "查看剪辑进度",
      primaryLink: `/tasks/${latestTask.id}`,
    };
  }

  if (!hasMaterials) {
    return {
      summary,
      hasMaterials,
      hasPlan,
      hasSmartEditTask: false,
      primaryText: "上传素材",
      primaryLink: `/products/${product.id}/materials`,
      disabledReason: "请先上传图片或视频素材",
    };
  }

  if (!hasPlan) {
    return {
      summary,
      hasMaterials,
      hasPlan,
      hasSmartEditTask: false,
      primaryText: "生成剪辑方案",
      primaryLink: `/products/${product.id}/creative-plan`,
      disabledReason: "请先生成方案，智能剪辑需要分镜作为剪辑依据",
    };
  }

  return {
    summary,
    hasMaterials,
    hasPlan,
    hasSmartEditTask: false,
    primaryText: "开始智能剪辑",
    primaryLink: `/creative-plans/${latestPlan!.id}/review?mode=smart-edit`,
  };
}

export function SmartEditWorkspacePage() {
  const [summaries, setSummaries] = useState<WorkspaceTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(undefined);
    try {
      const data = await api.getWorkspaceTasks();
      setSummaries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <Spin fullscreen />;

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Smart Clip Editing</Typography.Text>
          <Typography.Title level={2}>智能素材剪辑</Typography.Title>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} loading={refreshing} onClick={() => loadData(true)}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/products/new")}>
            新建商品任务
          </Button>
        </Space>
      </section>

      <Alert
        type="info"
        showIcon
        icon={<ScissorOutlined />}
        message="智能素材剪辑使用商家上传的真实图片和视频，根据分镜自动切片、匹配镜头并合成为广告视频。"
      />

      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => loadData()}>
              重新加载
            </Button>
          }
        />
      ) : null}

      {summaries.length === 0 ? (
        <div className="surface">
          <Empty description="还没有可用于智能剪辑的商品任务">
            <Link to="/products/new">
              <Button type="primary" icon={<PlusOutlined />}>
                创建商品任务
              </Button>
            </Link>
          </Empty>
        </div>
      ) : (
        <Row gutter={[20, 20]}>
          {summaries.map((summary) => {
            const state = resolveProductState(summary);
            const { product, materialsCount, latestPlan, latestTask } = state.summary;
            const smartEditTask = state.hasSmartEditTask ? latestTask : undefined;

            return (
              <Col xs={24} lg={12} key={product.id}>
                <Card className="surface" hoverable>
                  <Space direction="vertical" size={12} className="full-width">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Space direction="vertical" size={4}>
                        <Typography.Text type="secondary">{product.category}</Typography.Text>
                        <Typography.Title level={4} style={{ margin: 0 }}>
                          {product.title}
                        </Typography.Title>
                      </Space>
                      {smartEditTask ? (
                        <Tag color={taskStatusColor(smartEditTask.status)}>
                          {taskStatusLabel(smartEditTask.status)}
                        </Tag>
                      ) : null}
                    </div>

                    <Typography.Text type="secondary">{product.usageScene}</Typography.Text>

                    <Space wrap>
                      {product.sellingPoints.map((point) => (
                        <Tag key={point}>{point}</Tag>
                      ))}
                    </Space>

                    <Space size={16}>
                      <Typography.Text type="secondary">素材 {materialsCount} 个</Typography.Text>
                      <Typography.Text type="secondary">方案 {summary.creativePlansCount} 个</Typography.Text>
                    </Space>

                    <div style={{ display: "flex", gap: 8 }}>
                      <Tooltip title={state.disabledReason}>
                        <Link to={state.primaryLink}>
                          <Button type="primary" icon={<ScissorOutlined />} disabled={!!state.disabledReason}>
                            {state.primaryText}
                          </Button>
                        </Link>
                      </Tooltip>
                      <Link to={`/products/${product.id}/materials`}>
                        <Button>素材库</Button>
                      </Link>
                    </div>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Space>
  );
}
