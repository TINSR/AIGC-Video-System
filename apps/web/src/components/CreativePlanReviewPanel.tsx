import { Alert, Button, Col, Row, Space, Tag, Typography, message } from "antd";
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
  productName: string;
  materials: Material[];
  onRender: (taskId: string) => void;
};

export function CreativePlanReviewPanel({ plan, productName, materials, onRender }: Props) {
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [scenes, setScenes] = useState(plan.scenes);
  const [selectedSceneId, setSelectedSceneId] = useState(plan.scenes[0]?.id);
  const [savingSceneId, setSavingSceneId] = useState<string>();
  const [approving, setApproving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string>();

  const selectedScene = useMemo(
    () => scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0],
    [scenes, selectedSceneId]
  );

  const materialMap = new Map(materials.map((material) => [material.id, material]));
  const isApproved = currentPlan.status === "approved";

  const saveScene = async (patch: Partial<Scene>) => {
    if (!selectedScene) return;
    setError(undefined);
    setSavingSceneId(selectedScene.id);
    try {
      const updated = await api.updateScene(currentPlan.id, selectedScene.id, patch);
      setScenes((current) => current.map((scene) => (scene.id === updated.id ? updated : scene)));
      message.success("分镜已保存");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "分镜保存失败";
      setError(messageText);
      message.error(messageText);
    } finally {
      setSavingSceneId(undefined);
    }
  };

  const approvePlan = async () => {
    setError(undefined);
    setApproving(true);
    try {
      const approved = await api.approvePlan(currentPlan.id);
      setCurrentPlan(approved);
      if (approved.scenes?.length) setScenes(approved.scenes);
      message.success("方案已审核通过");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "审核失败";
      setError(messageText);
      message.error(messageText);
    } finally {
      setApproving(false);
    }
  };

  const renderPlan = async () => {
    setError(undefined);
    setRendering(true);
    try {
      const task = await api.renderPlan(currentPlan.id);
      message.success("生成任务已创建");
      onRender(task.id);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "创建生成任务失败";
      setError(messageText);
      message.error(messageText);
    } finally {
      setRendering(false);
    }
  };

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">CreativePlan Review</Typography.Text>
          <Typography.Title level={2}>方案审核与分镜编辑</Typography.Title>
          <Space wrap>
            <Tag color="blue">商品：{productName}</Tag>
            <Tag color={isApproved ? "green" : "gold"}>{currentPlan.status}</Tag>
          </Space>
          <Typography.Paragraph>
            生成视频前请确认脚本、Visual Bible、合规/连贯性提醒和每个分镜。审核通过后才会创建视频生成任务。
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Button type="primary" size="large" loading={approving} disabled={isApproved} onClick={approvePlan}>
            {isApproved ? "已审核通过" : "审核通过"}
          </Button>
          <Button size="large" loading={rendering} disabled={!isApproved} onClick={renderPlan}>
            创建生成任务
          </Button>
        </Space>
      </section>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {!isApproved ? (
        <Alert type="info" showIcon message="当前处于审核前状态：可以继续编辑分镜，系统不会提前触发 render。" />
      ) : (
        <Alert type="success" showIcon message="方案已审核通过，可以创建视频生成任务。" />
      )}
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <ScriptResultPanel plan={currentPlan} />
        </Col>
        <Col xs={24} xl={12}>
          <VisualBiblePanel visualBible={currentPlan.visualBible} />
        </Col>
      </Row>
      <ComplianceWarningList
        complianceWarnings={currentPlan.complianceWarnings}
        continuityWarnings={currentPlan.continuityWarnings}
      />
      <Row gutter={[20, 20]} align="top">
        <Col xs={24} xl={14}>
          <div className="scene-list">
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                material={scene.materialId ? materialMap.get(scene.materialId) : undefined}
                active={selectedScene ? scene.id === selectedScene.id : false}
                onSelect={() => setSelectedSceneId(scene.id)}
              />
            ))}
          </div>
        </Col>
        <Col xs={24} xl={10}>
          {selectedScene ? (
            <SceneEditorPanel
              scene={selectedScene}
              materials={materials}
              saving={savingSceneId === selectedScene.id}
              onSave={saveScene}
            />
          ) : (
            <Alert type="warning" showIcon message="当前方案还没有分镜。" />
          )}
        </Col>
      </Row>
    </Space>
  );
}
