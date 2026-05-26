import { InboxOutlined } from "@ant-design/icons";
import { Upload, message } from "antd";
import type { UploadProps } from "antd";
import { api } from "../services/api";

type Props = {
  productId: string;
  onUploaded: () => void;
};

export function MaterialUploader({ productId, onUploaded }: Props) {
  const beforeUpload: UploadProps["beforeUpload"] = async (file) => {
    try {
      await api.uploadMaterial(productId, file);
      message.success(`${file.name} 上传成功`);
      onUploaded();
    } catch (err) {
      message.error(err instanceof Error ? err.message : `${file.name} 上传失败`);
    }
    return Upload.LIST_IGNORE;
  };

  return (
    <Upload.Dragger
      className="material-uploader"
      accept="image/*,video/*"
      multiple
      beforeUpload={beforeUpload}
      showUploadList={false}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">拖拽图片或短视频到这里</p>
      <p className="ant-upload-hint">支持图片和短视频，上传后会出现在当前商品素材库。</p>
    </Upload.Dragger>
  );
}
