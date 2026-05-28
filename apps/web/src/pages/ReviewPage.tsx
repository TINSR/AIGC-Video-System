import { Spin } from "antd";
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

  useEffect(() => {
    api.getCreativePlan(planId).then((nextPlan) => {
      setPlan(nextPlan);
      api.getMaterials(nextPlan.productId).then(setMaterials);
    });
  }, [planId]);

  if (!plan) return <Spin fullscreen />;

  return (
    <CreativePlanReviewPanel
      plan={plan}
      materials={materials}
      onRender={(taskId) => navigate(`/tasks/${taskId}`)}
    />
  );
}
