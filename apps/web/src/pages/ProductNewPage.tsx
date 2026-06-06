import { Typography, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProductForm } from "../components/ProductForm";
import { api } from "../services/api";

export function ProductNewPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="narrow-page">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Step 1</Typography.Text>
          <Typography.Title level={2}>创建商品</Typography.Title>
          <Typography.Paragraph>
            填写商品信息和核心卖点，创建后即可上传素材并生成视频方案。
          </Typography.Paragraph>
        </div>
      </section>
      <ProductForm
        submitting={submitting}
        onSubmit={async (values) => {
          setSubmitting(true);
          try {
            const product = await api.createProduct(values);
            message.success("商品已保存");
            navigate(`/products/${product.id}/materials`);
          } catch (err) {
            message.error(err instanceof Error ? err.message : "商品保存失败，请稍后重试");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}
