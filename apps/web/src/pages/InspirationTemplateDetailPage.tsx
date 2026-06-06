import { Alert, Button, Descriptions, Empty, Select, Space, Spin, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { InspirationTemplate, Product } from "@clipshop/shared";
import { api } from "../services/api";

const sourceModeCopy: Record<InspirationTemplate["sourceMode"], string> = {
  built_in: "内置模板",
  rule_generated: "规则归纳",
  manual: "人工维护"
};

export function InspirationTemplateDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<InspirationTemplate>();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);
    Promise.all([api.getInspirationTemplate(id), api.getProducts().catch(() => [])])
      .then(([nextTemplate, nextProducts]) => {
        if (!alive) return;
        setTemplate(nextTemplate);
        setProducts(nextProducts);
        setSelectedProductId((current) => current ?? nextProducts[0]?.id);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "加载灵感模板失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  const useTemplate = () => {
    if (!template || !selectedProductId) return;
    navigate(`/products/${selectedProductId}/creative-plan?templateId=${template.id}`);
  };

  if (loading) return <Spin fullscreen />;

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Template Detail</Typography.Text>
          <Typography.Title level={2}>{template?.name ?? "灵感模板详情"}</Typography.Title>
          {template ? (
            <Space wrap>
              <Tag color={template.status === "active" ? "green" : "default"}>{template.status}</Tag>
              <Tag color="purple">{sourceModeCopy[template.sourceMode]}</Tag>
              {template.category ? <Tag color="blue">{template.category}</Tag> : null}
            </Space>
          ) : null}
        </div>
        <Link to="/inspiration-templates">
          <Button>返回模板库</Button>
        </Link>
      </section>

      {error ? <Alert type="error" showIcon message={error} /> : null}
      {template ? (
        <>
          <div className="surface">
            <Space direction="vertical" size={12} className="full-width">
              <Space wrap>
                <Select
                  placeholder="选择商品"
                  style={{ width: 280 }}
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  options={products.map((product) => ({ value: product.id, label: product.title }))}
                />
                <Button type="primary" disabled={!selectedProductId || template.status !== "active"} onClick={useTemplate}>
                  使用此模板生成剧本
                </Button>
              </Space>
            </Space>
          </div>

          <div className="surface">
            <Descriptions column={{ xs: 1, md: 2 }} size="small">
              <Descriptions.Item label="模板名">{template.name}</Descriptions.Item>
              <Descriptions.Item label="类目">{template.category ?? "通用"}</Descriptions.Item>
              <Descriptions.Item label="描述">{template.description}</Descriptions.Item>
              <Descriptions.Item label="策略">{template.strategy}</Descriptions.Item>
              <Descriptions.Item label="Hook 类型">{template.hookType}</Descriptions.Item>
              <Descriptions.Item label="风格">{template.style}</Descriptions.Item>
              <Descriptions.Item label="来源视频数量">{template.referenceVideoIds.length}</Descriptions.Item>
              <Descriptions.Item label="来源模式">{sourceModeCopy[template.sourceMode]}</Descriptions.Item>
              <Descriptions.Item label="关键因子">
                <Space wrap>{template.factors.map((item) => <Tag key={item}>{item}</Tag>)}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="约束">
                <Space wrap>{template.constraints.map((item) => <Tag key={item}>{item}</Tag>)}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="分镜目标顺序">
                <Space wrap>{template.sceneGoals.map((item) => <Tag color="cyan" key={item}>{item}</Tag>)}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="标签">
                <Space wrap>{template.tags.map((item) => <Tag key={item}>{item}</Tag>)}</Space>
              </Descriptions.Item>
            </Descriptions>
          </div>
        </>
      ) : (
        <div className="surface">
          <Empty description="未找到灵感模板" />
        </div>
      )}
    </Space>
  );
}
