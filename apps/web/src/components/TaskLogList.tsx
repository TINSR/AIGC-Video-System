import { Empty, List, Tag } from "antd";
import type { TaskLog } from "@clipshop/shared";

type Props = {
  logs: TaskLog[];
};

export function TaskLogList({ logs }: Props) {
  return (
    <List
      className="surface"
      header="任务日志"
      dataSource={logs}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无日志" /> }}
      renderItem={(log) => (
        <List.Item>
          <List.Item.Meta
            title={
              <>
                <Tag color={log.level === "error" ? "red" : log.level === "warn" ? "gold" : "green"}>
                  {log.level}
                </Tag>
                {log.message}
              </>
            }
            description={new Date(log.timestamp).toLocaleString("zh-CN")}
          />
        </List.Item>
      )}
    />
  );
}
