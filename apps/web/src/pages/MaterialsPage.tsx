import { Button, Col, Row, Space, Typography } from "antd";
import { Link, useParams } from "react-router-dom";
import { MaterialCard } from "../components/MaterialCard";
import { MaterialUploader } from "../components/MaterialUploader";
import { materials, products } from "../data/mockData";

export function MaterialsPage() {
  const { productId = "product_001" } = useParams();
  const product = products.find((item) => item.id === productId) ?? products[0];
  const productMaterials = materials.filter((material) => material.productId === product.id);

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Step 2</Typography.Text>
          <Typography.Title level={2}>{product.title} 素材库</Typography.Title>
          <Typography.Paragraph>上传后的图片和视频会在这里以卡片形式查看、打标签并补充 AI 描述。</Typography.Paragraph>
        </div>
        <Link to={`/products/${product.id}/creative-plan`}>
          <Button type="primary">进入创意方案</Button>
        </Link>
      </section>
      <MaterialUploader />
      <Row gutter={[20, 20]}>
        {productMaterials.map((material) => (
          <Col xs={24} md={12} xl={8} key={material.id}>
            <MaterialCard material={material} />
          </Col>
        ))}
      </Row>
    </Space>
  );
}
