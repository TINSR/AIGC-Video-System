import { InboxOutlined } from "@ant-design/icons";
import { Alert, Modal, Space, Typography, Upload } from "antd";
import type { UploadProps } from "antd";
import type { MetricsImportBatch } from "../services/api";

type Props = {
  open: boolean;
  loading?: boolean;
  latestBatch?: MetricsImportBatch;
  error?: string;
  onImport: (file: File) => void;
  onClose: () => void;
};

export function MetricsCsvImportModal({ open, loading, latestBatch, error, onImport, onClose }: Props) {
  const uploadProps: UploadProps = {
    accept: ".csv,text/csv",
    maxCount: 1,
    showUploadList: false,
    beforeUpload(file) {
      onImport(file);
      return false;
    }
  };

  return (
    <Modal
      title="导入指标 CSV"
      open={open}
      confirmLoading={loading}
      onCancel={onClose}
      footer={null}
      width={720}
    >
      <Space direction="vertical" size={16} className="full-width">
        <Upload.Dragger {...uploadProps} disabled={loading}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">拖拽或点击上传 CSV</p>
          <p className="ant-upload-hint">
            表头：videoId,taskId,creativePlanId,templateId,platform,plays,clicks,conversions,averageWatchRate,collectedAt
          </p>
        </Upload.Dragger>
        {error ? <Alert type="warning" showIcon message="导入失败" description={error} /> : null}
        {latestBatch ? (
          <Alert
            type={latestBatch.rejectedRows > 0 ? "warning" : "success"}
            showIcon
            message="导入质量摘要"
            description={
              <Space direction="vertical" size={8}>
                <Typography.Text>
                  接收 {latestBatch.acceptedRows} 行，拒绝 {latestBatch.rejectedRows} 行，总计 {latestBatch.totalRows} 行。
                </Typography.Text>
                {latestBatch.errors.slice(0, 20).map((item) => (
                  <Typography.Text key={`${latestBatch.id}_${item.row}`} type="secondary">
                    第 {item.row} 行：{item.message}
                  </Typography.Text>
                ))}
              </Space>
            }
          />
        ) : null}
      </Space>
    </Modal>
  );
}
