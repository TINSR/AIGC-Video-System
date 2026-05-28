import { Button, Form, Input, Select } from "antd";
import type { Product } from "@clipshop/shared";

type ProductFormProps = {
  onSubmit: (values: Omit<Product, "id" | "createdAt">) => void;
  submitting?: boolean;
};

export function ProductForm({ onSubmit, submitting }: ProductFormProps) {
  return (
    <Form
      layout="vertical"
      className="surface"
      onFinish={(values) =>
        onSubmit({
          ...values,
          sellingPoints: values.sellingPoints
            .split(/[,，\n]/)
            .map((item: string) => item.trim())
            .filter(Boolean)
        })
      }
      initialValues={{
        category: "厨房小家电",
        sellingPoints: "30 秒鲜榨, 一冲即净, 通勤健身随身带"
      }}
    >
      <Form.Item label="商品标题" name="title" rules={[{ required: true, message: "请输入商品标题" }]}>
        <Input placeholder="例如：便携榨汁杯" />
      </Form.Item>
      <Form.Item label="类目" name="category" rules={[{ required: true, message: "请选择或输入类目" }]}>
        <Select
          options={[
            { value: "厨房小家电" },
            { value: "旅行用品" },
            { value: "个护清洁" },
            { value: "宠物用品" }
          ]}
        />
      </Form.Item>
      <Form.Item label="核心卖点" name="sellingPoints" rules={[{ required: true, message: "请输入卖点" }]}>
        <Input.TextArea rows={3} placeholder="用逗号或换行分隔" />
      </Form.Item>
      <Form.Item label="目标人群" name="targetAudience" rules={[{ required: true, message: "请输入目标人群" }]}>
        <Input placeholder="例如：上班族、健身人群、学生" />
      </Form.Item>
      <Form.Item label="使用场景" name="usageScene" rules={[{ required: true, message: "请输入使用场景" }]}>
        <Input.TextArea rows={3} placeholder="例如：办公室、健身房、旅行途中" />
      </Form.Item>
      <Button type="primary" htmlType="submit" size="large" loading={submitting}>
        保存商品并进入素材库
      </Button>
    </Form>
  );
}
