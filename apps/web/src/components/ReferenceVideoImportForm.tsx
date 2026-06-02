import { Alert, Button, Form, Input, Select, Space, Tabs, Upload, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import type { ReferenceVideoSourcePlatform, ReferenceVideoSourceType } from "@clipshop/shared";
import { api } from "../services/api";
import type { ReferenceVideoCreateInput } from "../services/api";

type Props = {
  onCreated: () => void;
};

const platformOptions: Array<{ value: ReferenceVideoSourcePlatform; label: string }> = [
  { value: "douyin_shop", label: "抖音电商" },
  { value: "tiktok_shop", label: "TikTok Shop" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "merchant_upload", label: "商家上传" },
  { value: "other", label: "其他" }
];

const sourceTypeOptions: Array<{ value: ReferenceVideoSourceType; label: string }> = [
  { value: "public_reference", label: "公开视频参考" },
  { value: "licensed_public", label: "已授权公开视频" },
  { value: "merchant_owned", label: "商家自有" }
];

function parseKeywords(value?: string) {
  return (value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
function isPrivateHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized) ||
    normalized === "::" ||
    normalized === "::1" ||
    /^f[cd]/.test(normalized) ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("::ffff:")
  );
}
function validatePlayableVideoUrl(raw?: string) {
  if (!raw) return Promise.reject(new Error("请输入可直接访问的视频文件 URL"));
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return Promise.reject(new Error("仅支持 HTTP/HTTPS 视频文件 URL"));
    }
    if (isPrivateHost(url.hostname)) {
      return Promise.reject(new Error("不支持 localhost 或局域网地址"));
    }
    if (!/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url.pathname + url.search)) {
      return Promise.reject(new Error("请输入可直接播放的视频文件 URL，例如 OSS MP4"));
    }
    return Promise.resolve();
  } catch {
    return Promise.reject(new Error("URL 格式不正确"));
  }
}

export function ReferenceVideoImportForm({ onCreated }: Props) {
  const [urlForm] = Form.useForm();
  const [uploadForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const createByUrl = async (values: ReferenceVideoCreateInput & { keywordsText?: string }) => {
    await api.createReferenceVideo({
      title: values.title,
      sourcePlatform: values.sourcePlatform,
      sourceType: values.sourceType,
      sourceUrl: values.sourceUrl,
      sourceNote: values.sourceNote,
      category: values.category,
      keywords: parseKeywords(values.keywordsText)
    });
    messageApi.success("参考视频已保存");
    urlForm.resetFields();
    onCreated();
  };

  const beforeUpload: UploadProps["beforeUpload"] = async (file) => {
    try {
      const values = await uploadForm.validateFields();
      await api.uploadReferenceVideo(file, {
        title: values.title,
        sourceType: "merchant_owned",
        sourceNote: values.sourceNote,
        category: values.category,
        keywords: parseKeywords(values.keywordsText)
      });
      messageApi.success("商家自有视频已上传");
      uploadForm.resetFields();
      onCreated();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : "上传失败");
    }
    return Upload.LIST_IGNORE;
  };

  return (
    <div className="surface">
      {contextHolder}
      <Space direction="vertical" size={16} className="full-width">
        <Alert
          type="info"
          showIcon
          message="仅保存结构化分析结果，不复刻、不混剪参考视频。"
          description="请输入可直接访问的视频文件 URL。平台页面链接暂不支持自动解析。"
        />
        <Tabs
          items={[
            {
              key: "url",
              label: "公开可播放 URL 导入",
              children: (
                <Form form={urlForm} layout="vertical" onFinish={createByUrl}>
                  <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
                    <Input placeholder="例如：夏季爆款榨汁杯参考视频" />
                  </Form.Item>
                  <Form.Item name="sourcePlatform" label="来源平台" initialValue="other" rules={[{ required: true }]}>
                    <Select options={platformOptions} />
                  </Form.Item>
                  <Form.Item name="sourceType" label="来源类型" initialValue="public_reference" rules={[{ required: true }]}>
                    <Select options={sourceTypeOptions.filter((item) => item.value !== "merchant_owned")} />
                  </Form.Item>
                  <Form.Item
                    name="sourceUrl"
                    label="公开可播放视频 URL，例如 OSS MP4"
                    rules={[{ validator: (_, value) => validatePlayableVideoUrl(value) }]}
                  >
                    <Input placeholder="https://example.com/reference.mp4" />
                  </Form.Item>
                  <Form.Item name="sourceNote" label="来源说明" rules={[{ required: true, message: "请填写来源说明" }]}>
                    <Input.TextArea rows={3} placeholder="说明授权、来源页面或使用边界" />
                  </Form.Item>
                  <Form.Item name="category" label="类目" rules={[{ required: true, message: "请输入类目" }]}>
                    <Input placeholder="厨房小家电" />
                  </Form.Item>
                  <Form.Item name="keywordsText" label="关键词">
                    <Input placeholder="用逗号分隔，例如：开场强钩子, 商品特写" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">
                    保存参考视频
                  </Button>
                </Form>
              )
            },
            {
              key: "upload",
              label: "商家自有视频上传",
              children: (
                <Form form={uploadForm} layout="vertical">
                  <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
                    <Input placeholder="例如：商家自有试拍视频" />
                  </Form.Item>
                  <Form.Item label="来源类型">
                    <Input value="merchant_owned" disabled />
                  </Form.Item>
                  <Form.Item name="sourceNote" label="来源说明" rules={[{ required: true, message: "请填写来源说明" }]}>
                    <Input.TextArea rows={3} placeholder="例如：商家自有素材，仅用于结构化拆解" />
                  </Form.Item>
                  <Form.Item name="category" label="类目" rules={[{ required: true, message: "请输入类目" }]}>
                    <Input placeholder="厨房小家电" />
                  </Form.Item>
                  <Form.Item name="keywordsText" label="关键词">
                    <Input placeholder="用逗号分隔" />
                  </Form.Item>
                  <Upload.Dragger accept="video/*" beforeUpload={beforeUpload} showUploadList={false}>
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">选择或拖拽商家自有视频</p>
                    <p className="ant-upload-hint">仅用于结构化分析，不提供混剪原视频入口。</p>
                  </Upload.Dragger>
                </Form>
              )
            }
          ]}
        />
      </Space>
    </div>
  );
}
