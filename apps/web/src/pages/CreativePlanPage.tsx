import { Alert, Button, Form, Input, Space, Spin, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Product, ScriptStyle } from "@clipshop/shared";
import { StyleTemplateSelector } from "../components/StyleTemplateSelector";
import { api } from "../services/api";

export function CreativePlanPage() {
  const { productId = "product_001" } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product>();
  const [style, setStyle] = useState<ScriptStyle>("pain_point");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);
    api
      .getProducts()
      .then((items) => {
        if (!alive) return;
        setProduct(items.find((item) => item.id === productId) ?? items[0]);
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

  const handleGenerate = async ({ merchantAdCopy }: { merchantAdCopy: string }) => {
    if (!product) return;
    setGenerating(true);
    setError(undefined);
    try {
      const plan = await api.generateCreativePlan(product.id, { style, merchantAdCopy, maxDuration: 15 });
      message.success("CreativePlan 已生成");
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
