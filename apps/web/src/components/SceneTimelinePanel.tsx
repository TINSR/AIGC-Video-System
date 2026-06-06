import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { Alert, Button, Input, InputNumber, Select, Space, Tag, Tooltip, Typography } from "antd";
import type { Scene } from "@clipshop/shared";
import { resolveAssetUrl } from "../services/api";

type ScenePatch = Partial<Pick<Scene, "duration" | "transition" | "subtitle" | "voiceover" | "seedancePrompt">>;

type Props = {
  scenes: Scene[];
  dirty: boolean;
  saving?: boolean;
  regeneratingSceneId?: string;
  renderingPreviewSceneId?: string;
  scenePreviewAvailable?: boolean;
  onChange: (sceneId: string, patch: ScenePatch) => void;
  onMove: (sceneId: string, direction: "up" | "down") => void;
  onSave: () => void;
  onRegenerate: (sceneId: string) => void;
  onRenderPreview?: (sceneId: string) => void;
};

const transitionOptions = [
  { value: "cut", label: "cut" },
  { value: "fade", label: "fade" },
  { value: "zoom", label: "zoom" }
];

export function SceneTimelinePanel({
  scenes,
  dirty,
  saving,
  regeneratingSceneId,
  renderingPreviewSceneId,
  scenePreviewAvailable,
  onChange,
  onMove,
  onSave,
  onRegenerate,
  onRenderPreview
}: Props) {
  const totalDuration = scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0);
  const overDuration = totalDuration > 15;

  return (
    <section className="surface scene-timeline">
      <div className="timeline-toolbar">
        <div>
          <Typography.Text type="secondary">Scene Timeline / 分镜剪辑台</Typography.Text>
          <Typography.Title level={3}>轻量分镜剪辑台</Typography.Title>
        </div>
        <Space wrap>
          <Tag color={overDuration ? "warning" : "green"} icon={<ClockCircleOutlined />}>
            总时长：{totalDuration}s
          </Tag>
          {dirty ? <Tag color="gold">有未保存剪辑</Tag> : <Tag color="blue">剪辑已保存</Tag>}
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
            保存剪辑
          </Button>
        </Space>
      </div>

      {overDuration ? (
        <Alert
          type="warning"
          showIcon
          message="总时长已超过 15s，仍可保存，但建议压缩分镜时长后再 render。"
        />
      ) : null}

      <div className="timeline-track" aria-label="Scene timeline">
        {scenes.map((scene, index) => {
          const scenePreviewUrl = resolveAssetUrl(scene.previewVideoUrl ?? undefined);
          const previewRunning =
            renderingPreviewSceneId === scene.id || scene.renderStatus === "pending" || scene.renderStatus === "running";
          const previewFailed = scene.renderStatus === "failed";

          return (
            <article className="timeline-scene" key={scene.id}>
              <div className="timeline-scene-header">
                <Space wrap>
                  <Tag color="purple">Scene {index + 1}</Tag>
                  {scene.goal ? <Tag color="geekblue">goal: {scene.goal}</Tag> : null}
                  {scene.materialUsage ? <Tag color="cyan">material: {scene.materialUsage}</Tag> : null}
                  {scene.renderStatus ? (
                    <Tag color={previewFailed ? "red" : scene.renderStatus === "success" ? "green" : "blue"}>
                      {scene.renderStatus}
                    </Tag>
                  ) : null}
                  <Tag>{scene.duration}s</Tag>
                  <Tag>{scene.transition}</Tag>
                  {scene.warnings.length > 0 ? (
                    <Tag color="warning" icon={<WarningOutlined />}>
                      需检查
                    </Tag>
                  ) : null}
                </Space>
                <Space.Compact>
                  <Tooltip title="上移">
                    <Button
                      aria-label={`Move scene ${index + 1} up`}
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0 || saving}
                      onClick={() => onMove(scene.id, "up")}
                    />
                  </Tooltip>
                  <Tooltip title="下移">
                    <Button
                      aria-label={`Move scene ${index + 1} down`}
                      icon={<ArrowDownOutlined />}
                      disabled={index === scenes.length - 1 || saving}
                      onClick={() => onMove(scene.id, "down")}
                    />
                  </Tooltip>
                </Space.Compact>
              </div>

              <div className="timeline-form-grid">
                <label>
                  <span>Duration</span>
                  <InputNumber
                    min={1}
                    max={15}
                    value={scene.duration}
                    addonAfter="s"
                    onChange={(value) => onChange(scene.id, { duration: Number(value ?? 1) })}
                  />
                </label>
                <label>
                  <span>Transition</span>
                  <Select
                    value={scene.transition}
                    options={transitionOptions}
                    onChange={(transition) => onChange(scene.id, { transition })}
                  />
                </label>
              </div>

            <label className="timeline-field">
              <span>Subtitle</span>
              <Input value={scene.subtitle} onChange={(event) => onChange(scene.id, { subtitle: event.target.value })} />
            </label>

            <label className="timeline-field">
              <span>Voiceover</span>
              <Input.TextArea
                rows={3}
                value={scene.voiceover}
                onChange={(event) => onChange(scene.id, { voiceover: event.target.value })}
              />
            </label>

            <div className="readonly-field">
              <span>Visual Description</span>
              <Typography.Paragraph>{scene.visualDescription}</Typography.Paragraph>
            </div>

            <label className="timeline-field">
              <span>Seedance Prompt</span>
              <Input.TextArea
                rows={4}
                value={scene.seedancePrompt}
                onChange={(event) => onChange(scene.id, { seedancePrompt: event.target.value })}
              />
            </label>

            {scene.warnings.length > 0 ? (
              <div className="scene-warning-list">
                {scene.warnings.map((warning) => (
                  <Alert key={warning} type="warning" showIcon message={warning} />
                ))}
              </div>
            ) : null}

            {previewFailed ? (
              <Alert
                type="warning"
                showIcon
                message="分镜预览生成失败，不影响整片 render。可以继续编辑分镜或稍后重试。"
              />
            ) : null}

            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                loading={regeneratingSceneId === scene.id}
                onClick={() => onRegenerate(scene.id)}
              >
                重新生成文案/提示词
              </Button>
              {scenePreviewUrl ? (
                <Button icon={<LinkOutlined />} href={scenePreviewUrl} target="_blank">
                  查看分镜预览
                </Button>
              ) : (
                <Tooltip
                  title={
                    scenePreviewAvailable
                      ? "生成当前分镜的短预览，不影响整片生成。"
                      : "当前暂不支持分镜预览。"
                  }
                >
                  <Button
                    icon={<PlayCircleOutlined />}
                    loading={previewRunning}
                    disabled={!scenePreviewAvailable || !onRenderPreview || saving}
                    onClick={() => onRenderPreview?.(scene.id)}
                  >
                    {previewRunning ? "预览生成中" : previewFailed ? "重新生成预览" : "生成预览"}
                  </Button>
                </Tooltip>
              )}
            </Space>
            </article>
          );
        })}
      </div>
    </section>
  );
}
