import { Button, Form, Input, InputNumber, Select, Space } from "antd";
import type { Material, Scene } from "@clipshop/shared";

type Props = {
  scene: Scene;
  materials: Material[];
  onSave: (scene: Partial<Scene>) => void;
};

export function SceneEditorPanel({ scene, materials, onSave }: Props) {
  return (
    <Form
      key={scene.id}
      layout="vertical"
      className="surface sticky-panel"
      initialValues={scene}
      onFinish={onSave}
    >
      <Form.Item label="画面描述" name="visualDescription">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item label="字幕" name="subtitle">
        <Input />
      </Form.Item>
      <Form.Item label="旁白" name="voiceover">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Space className="form-row" align="start">
        <Form.Item label="时长" name="duration">
          <InputNumber min={1} max={8} addonAfter="s" />
        </Form.Item>
        <Form.Item label="转场" name="transition">
          <Select
            options={[
              { value: "cut", label: "cut" },
              { value: "fade", label: "fade" },
              { value: "zoom", label: "zoom" }
            ]}
          />
        </Form.Item>
      </Space>
      <Form.Item label="绑定素材" name="materialId">
        <Select
          options={materials.map((material) => ({
            value: material.id,
            label: material.title
          }))}
        />
      </Form.Item>
      <Form.Item label="Seedance Prompt" name="seedancePrompt">
        <Input.TextArea rows={5} />
      </Form.Item>
      <Button type="primary" htmlType="submit">
        保存分镜修改
      </Button>
    </Form>
  );
}
