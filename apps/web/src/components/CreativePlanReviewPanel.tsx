import { Alert, Button, Col, Row, Space, Tag, Typography, message } from "antd";
import { useState } from "react";
import type { CreativePlan, Material, Scene } from "@clipshop/shared";
import { api } from "../services/api";
import { ComplianceWarningList } from "./ComplianceWarningList";
import { SceneTimelinePanel } from "./SceneTimelinePanel";
import { ScriptResultPanel } from "./ScriptResultPanel";
import { StrategyReviewPanel } from "./StrategyReviewPanel";
import { VisualBiblePanel } from "./VisualBiblePanel";

type Props = {
  plan: CreativePlan;
  productName: string;
  materials: Material[];
  onRender: (taskId: string) => void;
};

type EditableScenePatch = Partial<
  Pick<Scene, "duration" | "transition" | "subtitle" | "voiceover" | "seedancePrompt">
>;

export function CreativePlanReviewPanel({ plan, productName, onRender }: Props) {
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [scenes, setScenes] = useState(() => [...plan.scenes].sort((a, b) => a.order - b.order));
  const [dirty, setDirty] = useState(false);
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [regeneratingSceneId, setRegeneratingSceneId] = useState<string>();
  const [approving, setApproving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string>();

  const isApproved = currentPlan.status === "approved";

  const normalizeScenes = (nextScenes: Scene[]) =>
    nextScenes.map((scene, index) => ({
      ...scene,
      order: index + 1,
      duration: Math.min(15, Math.max(1, Number(scene.duration || 1)))
    }));

  const updateSceneDraft = (sceneId: string, patch: EditableScenePatch) => {
    setScenes((current) => current.map((scene) => (scene.id === sceneId ? { ...scene, ...patch } : scene)));
    setDirty(true);
  };

  const moveScene = (sceneId: string, direction: "up" | "down") => {
    setScenes((current) => {
      const index = current.findIndex((scene) => scene.id === sceneId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return normalizeScenes(next);
    });
    setDirty(true);
  };

  const saveTimeline = async (showToast = true) => {
    setError(undefined);
    setSavingTimeline(true);
    try {
      const normalized = normalizeScenes(scenes);
      const updated = await api.updateCreativePlan(currentPlan.id, { scenes: normalized });
      const updatedScenes = [...(updated.scenes ?? normalized)].sort((a, b) => a.order - b.order);
      setCurrentPlan(updated);
      setScenes(updatedScenes);
      setDirty(false);
      if (showToast) message.success("剪辑已保存");
      return updated;
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "剪辑保存失败";
      setError(messageText);
      message.error(messageText);
      throw err;
    } finally {
      setSavingTimeline(false);
    }
  };

  const approvePlan = async () => {
    setError(undefined);
    setApproving(true);
    try {
      const planForApprove = dirty ? await saveTimeline(false) : currentPlan;
      const approved = await api.approvePlan(planForApprove.id);
      setCurrentPlan(approved);
      if (approved.scenes?.length) setScenes([...approved.scenes].sort((a, b) => a.order - b.order));
      setDirty(false);
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
      const planForRender = dirty ? await saveTimeline(false) : currentPlan;
      const task = await api.renderPlan(planForRender.id);
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

  const regenerateScene = async (sceneId: string) => {
    setError(undefined);
    setRegeneratingSceneId(sceneId);
    try {
      if (dirty) await saveTimeline(false);
      const regenerated = await api.regenerateScene(currentPlan.id, sceneId);
      setScenes((current) => normalizeScenes(current.map((scene) => (scene.id === sceneId ? regenerated : scene))));
      setDirty(false);
      message.success("文案/提示词已重新生成");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "重新生成失败";
      setError(messageText);
      message.error(messageText);
    } finally {
      setRegeneratingSceneId(undefined);
    }
  };

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">CreativePlan Review</Typography.Text>
          <Typography.Title level={2}>方案审核与分镜剪辑</Typography.Title>
          <Space wrap>
            <Tag color="blue">商品：{productName}</Tag>
            <Tag color={isApproved ? "green" : "gold"}>{currentPlan.status}</Tag>
          </Space>
          <Typography.Paragraph>
            先调整分镜顺序、时长、转场、字幕、旁白和 Seedance Prompt，再保存剪辑并进入生成。
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Button
            type="primary"
            size="large"
            loading={approving || savingTimeline}
            disabled={isApproved}
            onClick={approvePlan}
          >
            {isApproved ? "已审核通过" : "审核通过"}
          </Button>
          <Button size="large" loading={rendering || savingTimeline} disabled={!isApproved} onClick={renderPlan}>
            创建生成任务
          </Button>
        </Space>
      </section>

      {error ? <Alert type="error" showIcon message={error} /> : null}
      {!isApproved ? (
        <Alert type="info" showIcon message="审核通过前不会触发 render，可以先放心编辑并保存分镜。" />
      ) : (
        <Alert type="success" showIcon message="方案已审核通过，可以创建视频生成任务。" />
      )}
      {dirty ? <Alert type="warning" showIcon message="当前有未保存剪辑；点击审核或 render 时会先自动保存。" /> : null}

      <StrategyReviewPanel plan={currentPlan} productName={productName} />

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

      {scenes.length > 0 ? (
        <SceneTimelinePanel
          scenes={scenes}
          dirty={dirty}
          saving={savingTimeline}
          regeneratingSceneId={regeneratingSceneId}
          onChange={updateSceneDraft}
          onMove={moveScene}
          onSave={() => void saveTimeline()}
          onRegenerate={regenerateScene}
        />
      ) : (
        <Alert type="warning" showIcon message="当前方案还没有分镜。" />
      )}
    </Space>
  );
}
