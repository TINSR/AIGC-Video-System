import { CheckCircleOutlined, ClockCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { Progress, Steps } from "antd";
import type { GenerationTask } from "@clipshop/shared";

// 三套流程阶段定义
const SEEDANCE_STEPS = ["排队", "读取方案", "Seedance 远端生成", "下载视频", "完成"];
const FFMPEG_STEPS = ["排队", "读取方案", "准备素材", "FFmpeg 合成", "完成"];
const SMART_CLIP_STEPS = ["排队", "读取方案", "匹配镜头", "智能剪辑", "完成"];

type Props = {
  task: GenerationTask;
};

// 判断当前流程类型
function getFlowType(task: GenerationTask): "seedance" | "ffmpeg" | "smart_clip" {
  // 智能剪辑优先级最高
  if (task.provider === "smart_clip_edit" || task.renderMode === "smart_clip_edit") {
    return "smart_clip";
  }

  // FFmpeg fallback
  if (task.provider === "ffmpeg_fallback") {
    return "ffmpeg";
  }

  // 检查日志和当前步骤是否包含FFmpeg相关关键词
  const logText = [task.currentStep, ...(task.logs ?? []).map(log => log.message)].filter(Boolean).join(" ");
  if (/FFmpeg|fallback|兜底/i.test(logText)) {
    return "ffmpeg";
  }

  // 默认为Seedance流程
  return "seedance";
}

// 判断当前步骤索引
function getCurrentStepIndex(task: GenerationTask, flowType: "seedance" | "ffmpeg" | "smart_clip"): number {
  // 成功状态直接到最后一步
  if (task.status === "success") {
    return flowType === "seedance" ? 4 : flowType === "ffmpeg" ? 4 : 4;
  }

  // 失败状态保持当前步骤
  if (task.status === "failed") {
    // 根据日志判断失败在哪一步
    const logText = [task.currentStep, ...(task.logs ?? []).map(log => log.message)].filter(Boolean).join(" ");

    if (flowType === "seedance") {
      if (/下载|download|落盘|outputs/i.test(logText)) return 3;
      if (/Seedance|远端|等待|生成中|已提交/i.test(logText)) return 2;
      if (/CreativePlan|读取/i.test(logText)) return 1;
      return 0;
    }

    if (flowType === "ffmpeg") {
      if (/FFmpeg|合成|渲染/i.test(logText)) return 3;
      if (/素材|准备/i.test(logText)) return 2;
      if (/CreativePlan|读取/i.test(logText)) return 1;
      return 0;
    }

    if (flowType === "smart_clip") {
      if (/智能剪辑|SmartEdit|合成/i.test(logText)) return 3;
      if (/匹配|镜头|clip/i.test(logText)) return 2;
      if (/CreativePlan|读取/i.test(logText)) return 1;
      return 0;
    }
  }

  // 运行中状态根据日志判断
  const logText = [task.currentStep, ...(task.logs ?? []).map(log => log.message)].filter(Boolean).join(" ");

  if (flowType === "seedance") {
    if (/下载|download|落盘|outputs/i.test(logText)) return 3;
    if (/Seedance|远端|等待|生成中|已提交/i.test(logText)) return 2;
    if (/CreativePlan|读取/i.test(logText)) return 1;
    return 0;
  }

  if (flowType === "ffmpeg") {
    if (/FFmpeg|合成|渲染/i.test(logText)) return 3;
    if (/素材|准备/i.test(logText)) return 2;
    if (/CreativePlan|读取/i.test(logText)) return 1;
    return 0;
  }

  if (flowType === "smart_clip") {
    if (/智能剪辑|SmartEdit|合成/i.test(logText)) return 3;
    if (/匹配|镜头|clip/i.test(logText)) return 2;
    if (/CreativePlan|读取/i.test(logText)) return 1;
    return 0;
  }

  return 0;
}

export function TaskProgressTimeline({ task }: Props) {
  const flowType = getFlowType(task);
  const steps = flowType === "seedance" ? SEEDANCE_STEPS : flowType === "ffmpeg" ? FFMPEG_STEPS : SMART_CLIP_STEPS;
  const current = getCurrentStepIndex(task, flowType);
  const progressStatus = task.status === "failed" ? "exception" : task.status === "success" ? "success" : "active";

  return (
    <div className="surface">
      <Progress percent={task.progress} status={progressStatus} />
      <Steps
        current={current}
        items={steps.map((title, index) => ({
          title,
          icon:
            index < current || task.status === "success" ? (
              <CheckCircleOutlined />
            ) : index === current && task.status === "running" ? (
              <LoadingOutlined />
            ) : (
              <ClockCircleOutlined />
            )
        }))}
      />
    </div>
  );
}
