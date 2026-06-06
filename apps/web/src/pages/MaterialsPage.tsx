import { Alert, Button, Col, Empty, Row, Space, Spin, Typography, message } from "antd";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Material, Product } from "@clipshop/shared";
import { MaterialCard } from "../components/MaterialCard";
import { MaterialUploader } from "../components/MaterialUploader";
import { api } from "../services/api";
import { getPrimaryStorageKey, pickPrimaryMaterialId } from "../services/materialMetadata";

export function MaterialsPage() {
  const { productId = "product_001" } = useParams();
  const [product, setProduct] = useState<Product>();
  const [productMaterials, setProductMaterials] = useState<Material[]>([]);
  const [primaryMaterialId, setPrimaryMaterialId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingPrimaryId, setSavingPrimaryId] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);

    Promise.all([api.getProduct(productId), api.getMaterials(productId).catch(() => [])])
      .then(([nextProduct, materials]) => {
        if (!alive) return;
        setProduct(nextProduct);
        setProductMaterials(materials);
        setPrimaryMaterialId(pickPrimaryMaterialId(materials, window.localStorage.getItem(getPrimaryStorageKey(productId))));
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "加载素材失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [productId]);

  if (loading) return <Spin fullscreen />;
  if (error) return <Alert type="error" showIcon message={error} />;
  if (!product) return <Alert type="warning" showIcon message="暂无商品，请先创建商品。" />;

  const setPrimaryMaterial = async (materialId: string) => {
    setSavingPrimaryId(materialId);
    try {
      const nextMaterials = await api.setPrimaryMaterial(product.id, materialId);
      window.localStorage.setItem(getPrimaryStorageKey(product.id), materialId);
      setProductMaterials(nextMaterials);
      setPrimaryMaterialId(pickPrimaryMaterialId(nextMaterials, materialId));
      message.success("商品主图已更新，后续生成将优先使用当前确认主图。");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "设置商品主图失败");
    } finally {
      setSavingPrimaryId(undefined);
    }
  };

  const analyzeRoles = async () => {
    setAnalyzing(true);
    try {
      await api.analyzeMaterialRoles(product.id);
      const nextMaterials = await api.getMaterials(product.id);
      setProductMaterials(nextMaterials);
      setPrimaryMaterialId(pickPrimaryMaterialId(nextMaterials, window.localStorage.getItem(getPrimaryStorageKey(product.id))));
      message.success("AI 素材角色分析已完成");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "AI 素材角色分析失败");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Step 2</Typography.Text>
          <Typography.Title level={2}>{product.title} 素材库</Typography.Title>
          <Typography.Paragraph>
            上传后的图片和视频会在这里确认素材角色、云端状态和商品首帧主图。
          </Typography.Paragraph>
        </div>
        <Space>
          <Button loading={analyzing} onClick={() => void analyzeRoles()}>AI 分析素材</Button>
          <Link to={`/products/${product.id}/creative-plan`}>
            <Button type="primary">进入创意方案</Button>
          </Link>
        </Space>
      </section>
      <MaterialUploader
        productId={product.id}
        onUploaded={async () => {
          const nextMaterials = await api.getMaterials(product.id);
          setProductMaterials(nextMaterials);
          setPrimaryMaterialId((current) => pickPrimaryMaterialId(nextMaterials, current));
        }}
      />
      {productMaterials.length === 0 ? (
        <div className="surface">
          <Empty description="暂无素材，请先上传商品图片或视频。" />
        </div>
      ) : (
        <Row gutter={[20, 20]}>
          {productMaterials.map((material) => (
            <Col xs={24} md={12} xl={8} key={material.id}>
              <MaterialCard
                material={material}
                isPrimary={material.id === primaryMaterialId}
                primarySaving={material.id === savingPrimaryId}
                onSetPrimary={(materialId) => void setPrimaryMaterial(materialId)}
              />
            </Col>
          ))}
        </Row>
      )}
    </Space>
  );
}
