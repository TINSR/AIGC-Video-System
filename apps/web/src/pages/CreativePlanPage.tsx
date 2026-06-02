import { Alert, Button, Form, Input, Space, Spin, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { CreativePlan, InspirationTemplateRecommendation, Product, ScriptStyle } from "@clipshop/shared";
import { InspirationTemplateRecommendationPanel } from "../components/InspirationTemplateRecommendationPanel";
import { PlanGenerationProgress } from "../components/PlanGenerationProgress";
import { StyleTemplateSelector } from "../components/StyleTemplateSelector";
import { api } from "../services/api";

export function CreativePlanPage() {
  const { productId = "product_001" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referenceVideoId = searchParams.get("referenceVideoId")?.trim() || undefined;
  const queryTemplateId = searchParams.get("templateId")?.trim() || undefined;
  const [product, setProduct] = useState<Product>();
  const [plans, setPlans] = useState<CreativePlan[]>([]);
  const [style, setStyle] = useState<ScriptStyle>("pain_point");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(queryTemplateId);
  const [recommendations, setRecommendations] = useState<InspirationTemplateRecommendation[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);
    Promise.all([api.getProducts(), api.getCreativePlans(productId)])
      .then(([items, nextPlans]) => {
        if (!alive) return;
        setProduct(items.find((item) => item.id === productId) ?? items[0]);
        setPlans(nextPlans);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "加载商品失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [productId]);

  useEffect(() => {
    let alive = true;
    setRecommendationLoading(true);
    setRecommendationError(undefined);
    api
      .getInspirationTemplateRecommendations(productId)
      .then((items) => {
        if (!alive) return;
        setRecommendations(items);
      })
      .catch((err) => {
        if (!alive) return;
        setRecommendationError(err instanceof Error ? err.message : "加载模板推荐失败");
      })
      .finally(() => {
        if (alive) setRecommendationLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [productId]);

  const handleGenerate = async ({ merchantAdCopy }: { merchantAdCopy: string }) => {
    if (!product) return;
    setGenerating(true);
    setError(undefined);
    try {
      const plan = await api.generateCreativePlan(product.id, {
        style,
        merchantAdCopy,
        maxDuration: 15,
        referenceVideoId,
        templateId: selectedTemplateId
      });
      message.success("CreativePlan 已生成");
      setPlans((current) => [plan, ...current.filter((item) => item.id !== plan.id)]);
      navigate(`/creative-plans/${plan.id}/review`);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "生成 CreativePlan 失败";
      setError(messageText);
      message.error(messageText);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Spin fullscreen />;
  if (error && !product) return <Alert type="error" showIcon message={error} />;
  if (!product) return <Alert type="warning" showIcon message="暂无商品，请先创建商品。" />;

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Step 3</Typography.Text>
          <Typography.Title level={2}>生成创意方案</Typography.Title>
          <Typography.Paragraph>
            根据 {product.title} 的素材、卖点和商家诉求生成 CreativePlan、Visual Bible、分镜和 Seedance Prompt。
          </Typography.Paragraph>
        </div>
      </section>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {referenceVideoId ? (
        <Alert
          type="info"
          showIcon
          message="已选择参考视频"
          description={`生成时将注入 referenceVideoId=${referenceVideoId} 的结构化拆解结果。`}
        />
      ) : null}
      {selectedTemplateId ? (
        <Alert
          type="info"
          showIcon
          message="已选择灵感模板"
          description={`生成时将注入 templateId=${selectedTemplateId} 的模板策略、Hook、风格和分镜结构。`}
        />
      ) : null}
      <InspirationTemplateRecommendationPanel
        recommendations={recommendations}
        selectedTemplateId={selectedTemplateId}
        loading={recommendationLoading}
        error={recommendationError}
        onSelect={setSelectedTemplateId}
      />
      {generating ? <PlanGenerationProgress active={generating} /> : null}
      <Table
        className="surface"
        rowKey="id"
        pagination={false}
        dataSource={plans}
        columns={[
          { title: "方案", dataIndex: "title", ellipsis: true },
          {
            title: "状态",
            dataIndex: "status",
            render: (status: CreativePlan["status"]) => <Tag color={status === "approved" ? "green" : "blue"}>{status}</Tag>,
          },
          { title: "分镜", dataIndex: "scenes", render: (scenes: CreativePlan["scenes"]) => scenes.length },
          {
            title: "操作",
            render: (_: unknown, record: CreativePlan) => (
              <Button type="link" onClick={() => navigate(`/creative-plans/${record.id}/review`)}>
                继续审核
              </Button>
            ),
          },
        ]}
      />
      <Form
        layout="vertical"
        className="surface generation-form"
        initialValues={{ merchantAdCopy: "30 秒打一杯新鲜果汁，清洗方便，通勤也能带。" }}
        onFinish={handleGenerate}
      >
        <Form.Item label="视频风格模板">
          <StyleTemplateSelector value={style} onChange={setStyle} />
        </Form.Item>
        <Form.Item
          label="商家广告诉求"
          name="merchantAdCopy"
          rules={[{ required: true, message: "请填写商家广告诉求" }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" loading={generating}>
          生成 CreativePlan
        </Button>
      </Form>
    </Space>
  );
}
