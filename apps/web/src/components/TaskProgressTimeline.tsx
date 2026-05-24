import { CheckCircleOutlined, ClockCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { Progress, Steps } from "antd";
import type { GenerationTask } from "@clipshop/shared";

const steps = ["排队", "读取 CreativePlan", "Seedance 生成片段", "配音字幕", "FFmpeg 后处理", "完成"];

type Props = {
  task: GenerationTask;
};

export function TaskProgressTimeline({ task }: Props) {
  const current = task.status === "success" ? 5 : Math.min(Math.floor(task.progress / 20), 4);
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
