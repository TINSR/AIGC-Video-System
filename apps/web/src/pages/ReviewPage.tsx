import { Alert, Spin } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { CreativePlan, Material } from "@clipshop/shared";
import { CreativePlanReviewPanel } from "../components/CreativePlanReviewPanel";
import { api } from "../services/api";

export function ReviewPage() {
  const { planId = "plan_001" } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<CreativePlan>();
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
        const nextMaterials = await api.getMaterials(nextPlan.productId).catch(() => []);
        if (!alive) return;
        setPlan(nextPlan);
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
      materials={materials}
      onRender={(taskId) => navigate(`/tasks/${taskId}`)}
    />
  );
}
