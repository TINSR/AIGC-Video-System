import { Alert, Button, Empty, Input, Select, Space, Spin, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { InspirationTemplate, InspirationTemplateSourceMode, InspirationTemplateStatus } from "@clipshop/shared";
import { InspirationTemplateCard } from "../components/InspirationTemplateCard";
import { InspirationTemplateGenerateModal } from "../components/InspirationTemplateGenerateModal";
import { api } from "../services/api";

const sourceModeOptions: Array<{ value: InspirationTemplateSourceMode; label: string }> = [
  { value: "built_in", label: "内置模板" },
  { value: "rule_generated", label: "规则归纳" },
  { value: "manual", label: "人工维护" }
];

const statusOptions: Array<{ value: InspirationTemplateStatus; label: string }> = [
  { value: "active", label: "active" },
  { value: "archived", label: "archived" }
];

export function InspirationTemplateLibraryPage() {
  const [templates, setTemplates] = useState<InspirationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string>();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sourceMode, setSourceMode] = useState<InspirationTemplateSourceMode>();
  const [status, setStatus] = useState<InspirationTemplateStatus>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadTemplates = async () => {
    setLoading(true);
    setError(undefined);
    try {
      setTemplates(await api.getInspirationTemplates());
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载灵感模板库失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) => {
        if (category && !template.category?.includes(category)) return false;
        if (keyword) {
          const haystack = [
            template.name,
            template.description,
            template.strategy,
            template.hookType,
            template.style,
            ...template.factors,
            ...template.sceneGoals,
            ...template.tags
          ].join(" ");
          if (!haystack.includes(keyword)) return false;
        }
        if (sourceMode && template.sourceMode !== sourceMode) return false;
        if (status && template.status !== status) return false;
        return true;
      }),
    [category, keyword, sourceMode, status, templates]
  );

  const seedBuiltIns = async () => {
    setSeeding(true);
    setError(undefined);
    try {
      await api.seedBuiltInInspirationTemplates();
      messageApi.success("内置模板已初始化");
      await loadTemplates();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "初始化内置模板失败";
      setError(messageText);
      messageApi.error(messageText);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Space direction="vertical" size={20} className="full-width">
      {contextHolder}
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Inspiration Templates</Typography.Text>
          <Typography.Title level={2}>灵感模板库</Typography.Title>
          <Typography.Paragraph>
            将成功拆解的参考视频归纳为可复用模板，用可解释的策略、Hook、风格和分镜结构驱动商品剧本生成。
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Button loading={seeding} onClick={seedBuiltIns}>
            初始化内置模板
          </Button>
          <Button type="primary" onClick={() => setGenerateOpen(true)}>
            归纳模板
          </Button>
        </Space>
      </section>

      {error ? <Alert type="error" showIcon message="灵感模板库接口失败" description={error} /> : null}

      <div className="surface">
        <Space wrap>
          <Input placeholder="类目筛选" value={category} onChange={(event) => setCategory(event.target.value)} />
          <Input placeholder="keyword 筛选" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <Select
            allowClear
            placeholder="来源模式"
            style={{ width: 160 }}
            value={sourceMode}
            onChange={setSourceMode}
            options={sourceModeOptions}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
            options={statusOptions}
          />
        </Space>
      </div>

      {loading ? (
        <Spin />
      ) : filteredTemplates.length === 0 ? (
        <div className="surface">
          <Empty description="暂无灵感模板">
            <Space wrap>
              <Button loading={seeding} onClick={seedBuiltIns}>
                初始化内置模板
              </Button>
              <Button type="primary" onClick={() => setGenerateOpen(true)}>
                归纳模板
              </Button>
            </Space>
          </Empty>
        </div>
      ) : (
        <div className="template-card-grid">
          {filteredTemplates.map((template) => (
            <InspirationTemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      <InspirationTemplateGenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={loadTemplates}
      />
    </Space>
  );
}
