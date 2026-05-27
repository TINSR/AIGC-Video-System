import { InboxOutlined } from "@ant-design/icons";
import { Upload } from "antd";

export function MaterialUploader() {
  return (
    <Upload.Dragger
      className="material-uploader"
      accept="image/*,video/*"
      multiple
      beforeUpload={() => false}
      showUploadList={false}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">拖拽图片或短视频到这里</p>
      <p className="ant-upload-hint">Day 1 使用本地 Mock；后端接入后对齐 POST /api/products/:id/materials。</p>
    </Upload.Dragger>
  );
}
