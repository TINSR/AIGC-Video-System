import { Card, Image, Select, Space, Tag, Typography } from "antd";
import type { MaterialClip, SmartEditDecision } from "../services/api";
import { resolveAssetUrl } from "../services/api";

function ClipPreview({ clip }: { clip: MaterialClip }) {
  const url = resolveAssetUrl(clip.fileUrl);
  if (!url) return null;

  if (clip.type === "video_clip") {
    // Add #t=startTime,endTime to seek to clip time range
    const videoUrl = clip.startTime != null && clip.endTime != null
      ? `${url}#t=${clip.startTime},${clip.endTime}`
      : url;

    return (
      <video
        width={96}
        height={128}
        src={videoUrl}
        muted
        loop
        autoPlay
        playsInline
        style={{ objectFit: "cover", borderRadius: 8, background: "#05060a" }}
      />
    );
  }

  const thumbUrl = resolveAssetUrl(clip.thumbnailUrl ?? clip.fileUrl);
  return (
    <Image
      width={96}
      height={128}
      src={thumbUrl}
      alt={clip.summary}
      style={{ objectFit: "cover", borderRadius: 8, background: "#05060a" }}
    />
  );
}

type Props = {
  decision: SmartEditDecision;
  clips: MaterialClip[];
  replacing?: boolean;
  onReplaceClip: (sceneId: string, clipId: string) => void;
};

function goalCopy(goal?: SmartEditDecision["sceneGoal"]) {
  if (!goal) return "未标注";
  return goal;
}

function clipOptionLabel(clip: MaterialClip) {
  const fileName = clip.fileUrl.split("/").pop() ?? clip.id;
  return `${fileName} · ${clip.sceneType} · ${clip.type}`;
}

function compactClipOptionLabel(clip: MaterialClip) {
  const fileName = clip.fileUrl.split("/").pop() ?? clip.id;
  const compactName = fileName.length > 28 ? `${fileName.slice(0, 24)}...` : fileName;
  return `${compactName} · ${clip.sceneType} · ${clip.type}`;
}

export function SmartEditDecisionCard({ decision, clips, replacing, onReplaceClip }: Props) {
  const clip = decision.clip;

  return (
    <Card className="surface">
      <Space direction="vertical" size={12} className="full-width">
        <div className="strategy-heading">
          <Space direction="vertical" size={4}>
            <Space wrap>
              <Tag color="blue">Scene {decision.sceneOrder}</Tag>
              <Tag>{goalCopy(decision.sceneGoal)}</Tag>
              <Tag>{decision.sceneDuration}s</Tag>
            </Space>
            <Typography.Text strong>{decision.sceneSubtitle}</Typography.Text>
          </Space>
          <Space wrap>
            <Tag color={decision.score >= 80 ? "green" : decision.score >= 60 ? "gold" : "red"}>
              score {decision.score}
            </Tag>
            {decision.fallbackUsed ? <Tag color="orange">fallback</Tag> : <Tag color="green">matched</Tag>}
          </Space>
        </div>

        {clip ? (
          <Space align="start" size={12} className="full-width">
            <ClipPreview clip={clip} />
            <Space direction="vertical" size={6}>
              <Typography.Text>{clip.fileUrl.split("/").pop() ?? clip.id}</Typography.Text>
              <Space wrap>
                <Tag>{clip.type}</Tag>
                <Tag>{clip.sceneType}</Tag>
                <Tag>{clip.motionLevel}</Tag>
                <Tag>quality {Math.round(clip.visualQuality * 100)}</Tag>
              </Space>
              <Typography.Text type="secondary">{clip.summary}</Typography.Text>
            </Space>
          </Space>
        ) : (
          <Typography.Text type="secondary">暂无匹配素材，请先分析素材。</Typography.Text>
        )}

        <Space direction="vertical" size={6} className="full-width">
          <Typography.Text type="secondary">手动替换 clip</Typography.Text>
          <Select
            showSearch
            value={clip?.id}
            loading={replacing}
            disabled={clips.length === 0}
            placeholder="选择素材片段"
            optionFilterProp="label"
            popupMatchSelectWidth={false}
            style={{ width: "100%", minWidth: 0 }}
            onChange={(clipId) => onReplaceClip(decision.sceneId, clipId)}
            options={clips.map((item) => ({
              value: item.id,
              label: compactClipOptionLabel(item),
              title: clipOptionLabel(item)
            }))}
            optionRender={(option) => (
              <Typography.Text ellipsis={{ tooltip: option.data.title }}>{option.data.title}</Typography.Text>
            )}
          />
        </Space>

        <Space wrap>
          {decision.reasons.map((reason) => (
            <Tag key={reason} color="purple">
              {reason}
            </Tag>
          ))}
        </Space>
      </Space>
    </Card>
  );
}
