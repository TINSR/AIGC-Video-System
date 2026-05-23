import { Button, Col, Row, Space, Typography, message } from "antd";
import { useMemo, useState } from "react";
import type { CreativePlan, Material, Scene } from "@clipshop/shared";
import { api } from "../services/api";
import { ComplianceWarningList } from "./ComplianceWarningList";
import { SceneCard } from "./SceneCard";
import { SceneEditorPanel } from "./SceneEditorPanel";
import { ScriptResultPanel } from "./ScriptResultPanel";
import { VisualBiblePanel } from "./VisualBiblePanel";

type Props = {
  plan: CreativePlan;
  materials: Material[];
  onRender: (taskId: string) => void;
};

export function CreativePlanReviewPanel({ plan, materials, onRender }: Props) {
  const [scenes, setScenes] = useState(plan.scenes);
  const [selectedSceneId, setSelectedSceneId] = useState(plan.scenes[0]?.id);
  const selectedScene = useMemo(
    () => scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0],
    [scenes, selectedSceneId]
  );

  const materialMap = new Map(materials.map((material) => [material.id, material]));

  const saveScene = async (patch: Partial<Scene>) => {
    const updated = await api.updateScene(plan.id, selectedScene.id, patch);
    setScenes((current) => current.map((scene) => (scene.id === updated.id ? updated : scene)));
    message.success("分镜已保存");
  };

  const approveAndRender = async () => {
    await api.approvePlan(plan.id);
    const task = await api.renderPlan(plan.id);
    onRender(task.id);
  };

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">CreativePlan Review</Typography.Text>
          <Typography.Title level={2}>方案审核与分镜编辑</Typography.Title>
        </div>
        <Button type="primary" size="large" onClick={approveAndRender}>
          确认生成视频
        </Button>
      </section>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <ScriptResultPanel plan={plan} />
        </Col>
        <Col xs={24} xl={12}>
          <VisualBiblePanel visualBible={plan.visualBible} />
        </Col>
      </Row>
      <ComplianceWarningList
        complianceWarnings={plan.complianceWarnings}
        continuityWarnings={plan.continuityWarnings}
      />
      <Row gutter={[20, 20]} align="top">
        <Col xs={24} xl={14}>
          <div className="scene-list">
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                material={scene.materialId ? materialMap.get(scene.materialId) : undefined}
                active={scene.id === selectedScene.id}
                onSelect={() => setSelectedSceneId(scene.id)}
              />
            ))}
          </div>
        </Col>
        <Col xs={24} xl={10}>
          <SceneEditorPanel scene={selectedScene} materials={materials} onSave={saveScene} />
        </Col>
      </Row>
    </Space>
  );
}
