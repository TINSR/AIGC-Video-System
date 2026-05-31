import { CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Alert, Descriptions, Empty, Space, Steps, Tag, Typography } from "antd";
import type { AgentTrace, CreativePlan, CreativeStrategy } from "@clipshop/shared";

type Props = {
  plan: CreativePlan;
  productName: string;
};

const stageLabels: Record<string, string> = {
  strategy_review: "策略审核",
  storyboard_review: "分镜审核",
  approved: "已审核",
  rendering: "生成中",
  rendered: "已生成",
  failed: "生成失败",
  draft: "分镜审核"
};

const traceStatusColor: Record<AgentTrace["status"], string> = {
  success: "green",
  warning: "gold",
  failed: "red"
};

function listText(values?: string[]) {
  return values?.length ? values.join(" / ") : "等待后端策略字段返回";
}

function inferStrategy(plan: CreativePlan, productName: string): CreativeStrategy {
  return {
    ...plan.creativeStrategy,
    videoGoal: plan.creativeStrategy?.videoGoal ?? `围绕「${productName}」生成可投放短视频`,
    targetAudience: plan.creativeStrategy?.targetAudience ?? "从商品信息与脚本文案推导，后端字段返回后会优先展示",
    sellingPointOrder:
      plan.creativeStrategy?.sellingPointOrder ??
      [plan.hook, plan.adCopy, plan.cta].filter((item): item is string => Boolean(item)),
    emotionalArc: plan.creativeStrategy?.emotionalArc ?? "痛点唤起 -> 卖点证明 -> 行动转化",
    styleDirection: plan.creativeStrategy?.styleDirection ?? plan.visualBible?.style,
    recommendedSceneCount: plan.creativeStrategy?.recommendedSceneCount ?? plan.scenes?.length,
    warnings: plan.creativeStrategy?.warnings ?? []
  };
}

function buildTrace(plan: CreativePlan): AgentTrace[] {
  if (plan.agentTrace?.length) return plan.agentTrace;
  if (plan.creativeStrategy?.agentTrace?.length) return plan.creativeStrategy.agentTrace;

  return [
    { agent: "Product Analyst", status: "success", summary: "商品与受众信息已用于生成方案" },
    { agent: "Creative Strategy", status: "success", summary: "策略摘要已生成，可进入第一次审核" },
    { agent: "Visual Bible", status: "success", summary: "视觉风格已锁定" },
    { agent: "Storyboard", status: "success", summary: "分镜脚本已生成，可继续剪辑审核" },
    {
      agent: "Compliance / Continuity",
      status: plan.complianceWarnings.length || plan.continuityWarnings.length ? "warning" : "success",
      summary: plan.complianceWarnings.length || plan.continuityWarnings.length ? "发现需要人工确认的提醒" : "未发现阻塞项"
    }
  ];
}

export function StrategyReviewPanel({ plan, productName }: Props) {
  const strategy = inferStrategy(plan, productName);
  const traces = buildTrace(plan);
  const stage = plan.stage ?? (plan.status === "approved" ? "approved" : "storyboard_review");
  const hasRealAgentTrace = Boolean(plan.agentTrace?.length || plan.creativeStrategy?.agentTrace?.length);

  return (
    <section className="surface strategy-review">
      <div className="strategy-heading">
        <div>
          <Typography.Text type="secondary">Strategy Review / 第一次审核</Typography.Text>
          <Typography.Title level={3}>创意策略审核</Typography.Title>
        </div>
        <Space wrap>
          <Tag color="blue">{stageLabels[stage] ?? stage}</Tag>
          <Tag color={plan.renderMode === "scene_clips" ? "purple" : "cyan"}>
            renderMode: {plan.renderMode ?? "full_video"}
          </Tag>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        message={
          hasRealAgentTrace
            ? "已展示后端返回的 Agent 摘要；页面只展示 summary 和 warnings，不展示原始 prompt、模型内部推理或密钥。"
            : "暂无真实 agentTrace，当前使用 CreativePlan 字段推导摘要；页面不会展示原始 prompt 或模型内部推理。"
        }
      />

      <Descriptions column={{ xs: 1, md: 2 }} size="small" className="strategy-descriptions">
        <Descriptions.Item label="视频目标">{strategy.videoGoal}</Descriptions.Item>
        <Descriptions.Item label="目标人群">{strategy.targetAudience}</Descriptions.Item>
        <Descriptions.Item label="卖点顺序">{listText(strategy.sellingPointOrder)}</Descriptions.Item>
        <Descriptions.Item label="情绪节奏">{strategy.emotionalArc}</Descriptions.Item>
        <Descriptions.Item label="风格方向">{strategy.styleDirection}</Descriptions.Item>
        <Descriptions.Item label="推荐分镜数">{strategy.recommendedSceneCount ?? "等待后端返回"}</Descriptions.Item>
      </Descriptions>

      {strategy.warnings?.length ? (
        <div className="strategy-warning-list">
          {strategy.warnings.map((warning) => (
            <Alert key={warning} type="warning" showIcon message={warning} />
          ))}
        </div>
      ) : null}

      <div className="agent-trace">
        <Typography.Title level={4}>Agent 摘要</Typography.Title>
        {traces.length ? (
          <Steps
            direction="vertical"
            size="small"
            items={traces.map((trace) => ({
              title: (
                <Space wrap>
                  <span>{trace.agent}</span>
                  <Tag color={traceStatusColor[trace.status]}>{trace.status}</Tag>
                </Space>
              ),
              description: trace.summary,
              icon:
                trace.status === "success" ? (
                  <CheckCircleOutlined />
                ) : trace.status === "warning" ? (
                  <ExclamationCircleOutlined />
                ) : (
                  <InfoCircleOutlined />
                )
            }))}
          />
        ) : (
          <Empty description="暂无 Agent 摘要，等待后端 agentTrace 字段返回。" />
        )}
      </div>
    </section>
  );
}
