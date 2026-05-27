import { Alert, Spin } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { CreativePlan, Material, Product } from "@clipshop/shared";
import { CreativePlanReviewPanel } from "../components/CreativePlanReviewPanel";
import { api } from "../services/api";

export function ReviewPage() {
  const { planId = "plan_001" } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<CreativePlan>();
  const [product, setProduct] = useState<Product>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);

    api
      .getCreativePlan(planId)
      .then(async (nextPlan) => {
        const [nextMaterials, products] = await Promise.all([
          api.getMaterials(nextPlan.productId).catch(() => []),
          api.getProducts().catch(() => [])
        ]);
        if (!alive) return;
        setPlan(nextPlan);
        setProduct(products.find((item) => item.id === nextPlan.productId));
        setMaterials(nextMaterials);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "加载 CreativePlan 失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [planId]);

  if (loading) return <Spin fullscreen />;
  if (error) return <Alert type="error" showIcon message={error} />;
  if (!plan) return <Alert type="warning" showIcon message="未找到 CreativePlan" />;

  return (
    <CreativePlanReviewPanel
      plan={plan}
      productName={product?.title ?? plan.productId}
      materials={materials}
      onRender={(taskId) => navigate(`/tasks/${taskId}`)}
    />
  );
}
