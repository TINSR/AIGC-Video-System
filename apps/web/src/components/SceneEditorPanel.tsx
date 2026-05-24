import { Button, Form, Input, InputNumber, Select, Space } from "antd";
import type { Material, Scene } from "@clipshop/shared";

type ScenePatch = Pick<Scene, "subtitle" | "voiceover" | "duration" | "seedancePrompt"> &
  Partial<Pick<Scene, "visualDescription" | "transition" | "materialId">>;

type Props = {
  scene: Scene;
  materials: Material[];
  saving?: boolean;
  onSave: (scene: ScenePatch) => Promise<void> | void;
};

export function SceneEditorPanel({ scene, materials, saving, onSave }: Props) {
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
      <Form.Item label="字幕" name="subtitle" rules={[{ required: true, message: "请填写字幕" }]}>
        <Input />
      </Form.Item>
      <Form.Item label="旁白" name="voiceover" rules={[{ required: true, message: "请填写旁白" }]}>
        <Input.TextArea rows={3} />
      </Form.Item>
      <Space className="form-row" align="start">
        <Form.Item label="时长" name="duration" rules={[{ required: true, message: "请填写时长" }]}>
          <InputNumber min={1} max={30} addonAfter="s" />
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
          allowClear
          placeholder="选择素材"
          options={materials.map((material) => ({
            value: material.id,
            label: material.title
          }))}
        />
      </Form.Item>
      <Form.Item label="Seedance Prompt" name="seedancePrompt" rules={[{ required: true, message: "请填写 Prompt" }]}>
        <Input.TextArea rows={5} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={saving}>
        保存分镜修改
      </Button>
    </Form>
  );
}
