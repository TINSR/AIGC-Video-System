import { Empty, Timeline, Typography } from "antd";
import type { ReferenceVideoAnalysis } from "@clipshop/shared";

type Props = {
  scenes?: ReferenceVideoAnalysis["scenes"];
};

export function ReferenceVideoSceneTimeline({ scenes }: Props) {
  if (!scenes?.length) return <Empty description="暂无分镜时间轴" />;

  return (
    <Timeline
      items={scenes.map((scene) => ({
        children: (
          <div>
            <Typography.Text strong>
              {scene.startTime} - {scene.endTime} · {scene.goal}
            </Typography.Text>
            <Typography.Paragraph>{scene.summary}</Typography.Paragraph>
          </div>
        )
      }))}
    />
  );
}

