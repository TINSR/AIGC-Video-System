import { Button, Form, Input, Space, Typography, message } from "antd";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ScriptStyle } from "@clipshop/shared";
import { StyleTemplateSelector } from "../components/StyleTemplateSelector";
import { products } from "../data/mockData";
import { api } from "../services/api";

export function CreativePlanPage() {
  const { productId = "product_001" } = useParams();
  const navigate = useNavigate();
  const product = products.find((item) => item.id === productId) ?? products[0];
  const [style, setStyle] = useState<ScriptStyle>("pain_point");

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
      <Form
        layout="vertical"
        className="surface generation-form"
        initialValues={{ merchantAdCopy: "30 秒打一杯新鲜果汁，清洗方便，通勤也能带。" }}
        onFinish={async ({ merchantAdCopy }) => {
          const plan = await api.generateCreativePlan(product.id, { style, merchantAdCopy, maxDuration: 15 });
          message.success("CreativePlan 已生成");
          navigate(`/creative-plans/${plan.id}/review`);
        }}
      >
        <Form.Item label="视频风格模板">
          <StyleTemplateSelector value={style} onChange={setStyle} />
        </Form.Item>
        <Form.Item label="商家广告诉求" name="merchantAdCopy">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large">
          生成 CreativePlan
        </Button>
      </Form>
    </Space>
  );
}
