import { Button, Form, Input, Modal, Space, Typography, message } from "antd";
import { useState } from "react";
import { api } from "../services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
};

function parseIds(value?: string) {
  return (value ?? "")
    .split(/[,，\s]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
export function InspirationTemplateGenerateModal({ open, onClose, onGenerated }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const submit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      await api.generateInspirationTemplates({
        category: values.category,
        referenceVideoIds: parseIds(values.referenceVideoIds)
      });
      messageApi.success("灵感模板归纳完成");
      form.resetFields();
      onGenerated();
      onClose();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : "归纳模板失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="归纳灵感模板" open={open} onCancel={onClose} onOk={submit} confirmLoading={loading} okText="开始归纳">
      {contextHolder}
      <Space direction="vertical" size={12} className="full-width">
        <Typography.Paragraph type="secondary">
          后端会读取分析成功的参考视频并归纳 1-5 个可解释模板。没有成功拆解时会返回清晰错误。
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="类目">
            <Input placeholder="例如：箱包收纳" />
          </Form.Item>
          <Form.Item name="referenceVideoIds" label="指定来源 referenceVideoIds">
            <Input.TextArea rows={3} placeholder="可选，用逗号或空格分隔" />
          </Form.Item>
        </Form>
        <Button loading={loading} onClick={submit} type="primary">
          归纳模板
        </Button>
      </Space>
    </Modal>
  );
}
