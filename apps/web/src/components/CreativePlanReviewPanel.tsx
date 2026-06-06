import { Alert, Button, Col, Descriptions, Row, Space, Tag, Typography, message } from "antd";
import { useEffect, useRef, useState } from "react";
import type { CreativePlan, Material, Scene } from "@clipshop/shared";
import { SCENE_PREVIEW_AVAILABLE, api, resolveAssetUrl } from "../services/api";
import type { MaterialClip, SmartEditPlan } from "../services/api";
import { ComplianceWarningList } from "./ComplianceWarningList";
import { SceneTimelinePanel } from "./SceneTimelinePanel";
import { ScriptResultPanel } from "./ScriptResultPanel";
import { SmartEditDecisionPanel } from "./SmartEditDecisionPanel";
import { StrategyReviewPanel } from "./StrategyReviewPanel";
import { VisualBiblePanel } from "./VisualBiblePanel";
import { getMaterialRoleLabel, getPrimaryStorageKey, pickPrimaryMaterialId } from "../services/materialMetadata";

type Props = {
  plan: CreativePlan;
  productName: string;
  materials: Material[];
  initialMode?: "review" | "smart-edit";
  onRender: (taskId: string) => void;
};

type EditableScenePatch = Partial<
  Pick<Scene, "duration" | "transition" | "subtitle" | "voiceover" | "seedancePrompt">
>;

export function CreativePlanReviewPanel({ plan, productName, materials, initialMode = "review", onRender }: Props) {
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [scenes, setScenes] = useState(() => [...plan.scenes].sort((a, b) => a.order - b.order));
  const [dirty, setDirty] = useState(false);
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [regeneratingSceneId, setRegeneratingSceneId] = useState<string>();
  const [renderingPreviewSceneId, setRenderingPreviewSceneId] = useState<string>();
  const [approving, setApproving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [smartClips, setSmartClips] = useState<MaterialClip[]>([]);
  const [smartEditPlan, setSmartEditPlan] = useState<SmartEditPlan>();
  const [smartEditLoading, setSmartEditLoading] = useState(true);
  const [analyzingSmartClips, setAnalyzingSmartClips] = useState(false);
  const [matchingSmartEdit, setMatchingSmartEdit] = useState(false);
  const [renderingSmartEdit, setRenderingSmartEdit] = useState(false);
  const [replacingSmartEditSceneId, setReplacingSmartEditSceneId] = useState<string>();
  const [smartEditError, setSmartEditError] = useState<string>();
  const [withTts, setWithTts] = useState(true);
  const [error, setError] = useState<string>();
  const smartEditSectionRef = useRef<HTMLDivElement>(null);

  const isApproved = currentPlan.status === "approved";
  const primaryMaterialId = pickPrimaryMaterialId(
    materials,
    window.localStorage.getItem(getPrimaryStorageKey(currentPlan.productId))
  );
  const primaryMaterial = materials.find((material) => material.id === primaryMaterialId);
  const totalDuration = scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0);
  const sellingPointOrder = currentPlan.creativeStrategy?.sellingPointOrder?.join(" -> ") || currentPlan.adCopy;

  useEffect(() => {
    let alive = true;
    setSmartEditLoading(true);
    setSmartEditError(undefined);

    Promise.all([
      api.getMaterialClips(plan.productId).catch(() => []),
      api.getSmartEditPlan(plan.id).catch((err) => {
        const messageText = err instanceof Error ? err.message : "";
        if (/请先重新匹配|SMART_EDIT_PLAN_NOT_FOUND/i.test(messageText)) return undefined;
        throw err;
      })
    ])
      .then(([clips, nextSmartEditPlan]) => {
        if (!alive) return;
        setSmartClips(clips);
        setSmartEditPlan(nextSmartEditPlan);
      })
      .catch((err) => {
        if (!alive) return;
        setSmartEditError(err instanceof Error ? err.message : "加载智能剪辑结果失败");
      })
      .finally(() => {
        if (alive) setSmartEditLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [plan.id, plan.productId]);

  useEffect(() => {
    if (initialMode !== "smart-edit" || smartEditLoading) return;
    smartEditSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [initialMode, smartEditLoading]);

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
      const task = await api.renderPlan(planForRender.id, { primaryMaterialId });
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

  const analyzeSmartClips = async () => {
    setSmartEditError(undefined);
    setAnalyzingSmartClips(true);
    try {
      const clips = await api.analyzeMaterialClips(currentPlan.productId);
      setSmartClips(clips);
      setSmartEditPlan(undefined);
      message.success(`已分析 ${clips.length} 个素材切片`);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "分析素材失败";
      setSmartEditError(messageText);
      message.error(messageText);
    } finally {
      setAnalyzingSmartClips(false);
    }
  };

  const rematchSmartEditPlan = async () => {
    setSmartEditError(undefined);
    if (smartClips.length === 0) {
      message.info("请先分析素材");
      return;
    }
    setMatchingSmartEdit(true);
    try {
      if (dirty) await saveTimeline(false);
      const nextPlan = await api.createSmartEditPlan(currentPlan.id);
      setSmartEditPlan(nextPlan);
      message.success("已重新匹配分镜素材");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "重新匹配失败";
      setSmartEditError(messageText);
      message.error(messageText);
    } finally {
      setMatchingSmartEdit(false);
    }
  };

  const renderSmartClipEdit = async () => {
    setSmartEditError(undefined);
    setRenderingSmartEdit(true);
    try {
      if (dirty) await saveTimeline(false);
      let nextPlan = smartEditPlan;
      if (!nextPlan || nextPlan.decisions.length === 0) {
        nextPlan = await api.createSmartEditPlan(currentPlan.id);
        setSmartEditPlan(nextPlan);
      }
      const task = await api.renderSmartClipEdit(currentPlan.id, { withTts, withBgm: false });
      message.success("智能剪辑任务已创建");
      onRender(task.id);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "智能剪辑成片失败";
      setSmartEditError(messageText);
      message.error(messageText);
    } finally {
      setRenderingSmartEdit(false);
    }
  };

  const replaceSmartEditClip = async (sceneId: string, clipId: string) => {
    setSmartEditError(undefined);
    setReplacingSmartEditSceneId(sceneId);
    try {
      const nextPlan = await api.replaceSmartEditDecisionClip(currentPlan.id, sceneId, clipId);
      setSmartEditPlan(nextPlan);
      message.success("已保存手动替换，并重新生成 SmartEditPlan");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "手动替换 clip 失败";
      setSmartEditError(messageText);
      message.error(messageText);
    } finally {
      setReplacingSmartEditSceneId(undefined);
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

  const renderScenePreview = async (sceneId: string) => {
    setError(undefined);
    setRenderingPreviewSceneId(sceneId);
    try {
      if (dirty) await saveTimeline(false);
      setScenes((current) =>
        current.map((scene) => (scene.id === sceneId ? { ...scene, renderStatus: "running" } : scene))
      );
      const updatedScene = await api.renderScenePreview(currentPlan.id, sceneId);
      setScenes((current) => normalizeScenes(current.map((scene) => (scene.id === sceneId ? updatedScene : scene))));
      setDirty(false);
      message.success("分镜预览生成任务已提交");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "分镜预览生成失败";
      setScenes((current) =>
        current.map((scene) => (scene.id === sceneId ? { ...scene, renderStatus: "failed" } : scene))
      );
      setError(messageText);
      message.error(messageText);
    } finally {
      setRenderingPreviewSceneId(undefined);
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

      <div className="surface review-summary">
        <div>
          <Typography.Text type="secondary">Review Summary</Typography.Text>
          <Typography.Title level={3}>审核摘要</Typography.Title>
        </div>
        <Descriptions column={{ xs: 1, lg: 2 }} size="small">
          <Descriptions.Item label="策略目标">{currentPlan.creativeStrategy?.videoGoal ?? currentPlan.title}</Descriptions.Item>
          <Descriptions.Item label="目标人群">
            {currentPlan.creativeStrategy?.targetAudience ?? "等待策略输出"}
          </Descriptions.Item>
          <Descriptions.Item label="卖点顺序">{sellingPointOrder}</Descriptions.Item>
          <Descriptions.Item label="当前商品主图">
            {primaryMaterial ? (
              <Space align="start" wrap>
                <img
                  className="primary-thumb"
                  src={resolveAssetUrl(primaryMaterial.thumbnailUrl ?? primaryMaterial.fileUrl) ?? primaryMaterial.fileUrl}
                  alt={primaryMaterial.title}
                />
                <Space direction="vertical" size={2}>
                  <Typography.Text>{primaryMaterial.title}</Typography.Text>
                  <Typography.Text type="secondary">{getMaterialRoleLabel(primaryMaterial)}</Typography.Text>
                </Space>
              </Space>
            ) : (
              "尚未确认"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="分镜数量">{scenes.length}</Descriptions.Item>
          <Descriptions.Item label="分镜总时长">{totalDuration}s</Descriptions.Item>
          <Descriptions.Item label="当前视频模型">Seedance 1.5 Pro</Descriptions.Item>
        </Descriptions>
      </div>

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
          renderingPreviewSceneId={renderingPreviewSceneId}
          scenePreviewAvailable={SCENE_PREVIEW_AVAILABLE}
          onChange={updateSceneDraft}
          onMove={moveScene}
          onSave={() => void saveTimeline()}
          onRegenerate={regenerateScene}
          onRenderPreview={renderScenePreview}
        />
      ) : (
        <Alert type="warning" showIcon message="当前方案还没有分镜。" />
      )}

      <div ref={smartEditSectionRef}>
        <SmartEditDecisionPanel
          clips={smartClips}
          plan={smartEditPlan}
          loading={smartEditLoading}
          analyzing={analyzingSmartClips}
          matching={matchingSmartEdit}
          rendering={renderingSmartEdit}
          replacingSceneId={replacingSmartEditSceneId}
          error={smartEditError}
          withTts={withTts}
          onTtsChange={setWithTts}
          onAnalyze={analyzeSmartClips}
          onRematch={rematchSmartEditPlan}
          onRender={renderSmartClipEdit}
          onReplaceClip={replaceSmartEditClip}
        />
      </div>
    </Space>
  );
}
