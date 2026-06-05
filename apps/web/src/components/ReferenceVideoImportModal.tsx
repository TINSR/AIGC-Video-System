import { Modal, Tabs } from "antd";
import { ReferenceVideoImportForm } from "./ReferenceVideoImportForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function ReferenceVideoImportModal({ open, onClose, onCreated }: Props) {
  const handleCreated = () => {
    onCreated();
    onClose();
  };

  return (
    <Modal
      title="导入参考视频"
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <Tabs
        items={[
          {
            key: "url",
            label: "URL 导入",
            children: <ReferenceVideoImportForm onCreated={handleCreated} mode="url" />
          },
          {
            key: "upload",
            label: "本地上传",
            children: <ReferenceVideoImportForm onCreated={handleCreated} mode="upload" />
          }
        ]}
      />
    </Modal>
  );
}