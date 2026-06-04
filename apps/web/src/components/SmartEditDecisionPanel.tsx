import { Alert, Button, Empty, Space, Spin, Typography } from "antd";
import type { MaterialClip, SmartEditPlan } from "../services/api";
import { SmartEditDecisionCard } from "./SmartEditDecisionCard";

type Props = {
  clips: MaterialClip[];
  plan?: SmartEditPlan;
  loading?: boolean;
  analyzing?: boolean;
  matching?: boolean;
  rendering?: boolean;
  error?: string;
  onAnalyze: () => void;
  onRematch: () => void;
  onRender: () => void;
};

export function SmartEditDecisionPanel({
  clips,
  plan,
  loading,
  analyzing,
  matching,
  rendering,
  error,
  onAnalyze,
  onRematch,
  onRender
}: Props) {
  const busy = loading || analyzing || matching || rendering;
  const decisions = plan?.decisions ?? [];

  return (
    <div className="surface">
      <Space direction="vertical" size={16} className="full-width">
        <div className="strategy-heading">
          <div>
            <Typography.Text type="secondary">Smart Clip Editing Agent</Typography.Text>
            <Typography.Title level={3}>素材智能剪辑</Typography.Title>
            <Typography.Paragraph>
              根据分镜目标、字幕和视觉描述自动选择商家素材片段，并展示每个选择的得分与理由。
            </Typography.Paragraph>
          </div>
          <Space wrap>
            <Button loading={analyzing} disabled={busy && !analyzing} onClick={onAnalyze}>
              分析素材
            </Button>
            <Button loading={matching} disabled={busy && !matching} onClick={onRematch}>
              重新匹配
            </Button>
            <Button type="primary" loading={rendering} disabled={busy && !rendering} onClick={onRender}>
              素材智能剪辑成片
            </Button>
          </Space>
        </div>

        {error ? <Alert type="warning" showIcon message="智能剪辑暂不可用" description={error} /> : null}
        {loading ? <Spin /> : null}
        {!loading && clips.length === 0 ? (
          <Alert type="info" showIcon message="暂无素材切片，请先点击“分析素材”。" />
        ) : null}
        {!loading && clips.length > 0 && decisions.length === 0 ? (
          <Empty description="已有素材切片，请点击“重新匹配”生成分镜匹配结果。" />
        ) : null}
        {plan ? (
          <Alert
            type="success"
            showIcon
            message={`已生成 ${decisions.length} 个 scene -> clip 决策，总时长 ${plan.totalDuration}s`}
          />
        ) : null}
        {decisions.map((decision) => (
          <SmartEditDecisionCard key={decision.sceneId} decision={decision} />
        ))}
      </Space>
    </div>
  );
}
