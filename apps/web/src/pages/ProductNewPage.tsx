import { Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { ProductForm } from "../components/ProductForm";
import { api } from "../services/api";

export function ProductNewPage() {
  const navigate = useNavigate();

  return (
    <div className="narrow-page">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Step 1</Typography.Text>
          <Typography.Title level={2}>创建商品</Typography.Title>
          <Typography.Paragraph>填写标题、类目、卖点、人群和使用场景，字段与 POST /api/products 对齐。</Typography.Paragraph>
        </div>
      </section>
      <ProductForm
        onSubmit={async (values) => {
          const product = await api.createProduct(values);
          message.success("商品已保存");
          navigate(`/products/${product.id}/materials`);
        }}
      />
    </div>
  );
}
