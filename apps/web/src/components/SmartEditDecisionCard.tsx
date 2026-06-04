import { Card, Image, Space, Tag, Typography } from "antd";
import type { SmartEditDecision } from "../services/api";
import { resolveAssetUrl } from "../services/api";

type Props = {
  decision: SmartEditDecision;
};

function goalCopy(goal?: SmartEditDecision["sceneGoal"]) {
  if (!goal) return "未标注";
  return goal;
}

export function SmartEditDecisionCard({ decision }: Props) {
  const clip = decision.clip;
  const mediaUrl = resolveAssetUrl(clip?.thumbnailUrl ?? clip?.fileUrl);

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
            {mediaUrl ? (
              <Image
                width={96}
                height={128}
                src={mediaUrl}
                alt={clip.summary}
                style={{ objectFit: "cover", borderRadius: 8, background: "#05060a" }}
              />
            ) : null}
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
