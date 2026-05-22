import { ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Col, Row, Space, Table, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import { generationTasks, products } from "../data/mockData";

export function DashboardPage() {
  return (
    <Space direction="vertical" size={24} className="full-width">
      <section className="studio-hero">
        <div className="hero-copy">
          <Typography.Text type="secondary">Commerce video creation</Typography.Text>
          <Typography.Title>从商品素材到 Seedance 分镜 Prompt</Typography.Title>
          <Typography.Paragraph>
            保留 Mock 数据与 API 契约，先把商家审核、分镜编辑、任务进度和成片预览跑通。
          </Typography.Paragraph>
          <Space wrap>
            <Link to="/products/new">
              <Button type="primary" size="large" icon={<PlusOutlined />}>
                创建商品
              </Button>
            </Link>
            <Link to="/creative-plans/plan_001/review">
              <Button size="large" icon={<ArrowRightOutlined />}>
                查看方案审核
              </Button>
            </Link>
          </Space>
        </div>
        <div className="prompt-console">
          <div className="console-tabs">
            <Tag color="purple">视频生成</Tag>
            <Tag>图生视频</Tag>
            <Tag>商品脚本</Tag>
          </div>
          <div className="prompt-input">便携榨汁杯，早八通勤痛点，明亮厨房，TikTok 快节奏，9:16...</div>
          <div className="console-strip">
            <img src="https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=400&q=80" alt="水果素材" />
            <img src="https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=400&q=80" alt="饮品素材" />
            <img src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80" alt="旅行素材" />
          </div>
        </div>
      </section>

      <Row gutter={[20, 20]}>
        {products.map((product) => (
          <Col xs={24} lg={12} key={product.id}>
            <article className="product-card">
              <Typography.Text type="secondary">{product.category}</Typography.Text>
              <Typography.Title level={3}>{product.title}</Typography.Title>
              <Typography.Paragraph>{product.usageScene}</Typography.Paragraph>
              <Space wrap>
                {product.sellingPoints.map((point) => (
                  <Tag key={point}>{point}</Tag>
                ))}
              </Space>
              <Space wrap className="card-actions">
                <Link to={`/products/${product.id}/materials`}>
                  <Button>素材库</Button>
                </Link>
                <Link to={`/products/${product.id}/creative-plan`}>
                  <Button type="primary">生成方案</Button>
                </Link>
              </Space>
            </article>
          </Col>
        ))}
      </Row>

      <Table
        className="surface"
        rowKey="id"
        pagination={false}
        dataSource={generationTasks}
        columns={[
          { title: "任务", dataIndex: "id" },
          { title: "状态", dataIndex: "status", render: (status) => <Tag color={status === "success" ? "green" : "red"}>{status}</Tag> },
          { title: "当前步骤", dataIndex: "currentStep" },
          { title: "进度", dataIndex: "progress", render: (progress) => `${progress}%` },
          {
            title: "操作",
            render: (_, record) => (
              <Link to={record.status === "success" ? `/videos/${record.id}` : `/tasks/${record.id}`}>
                查看
              </Link>
            )
          }
        ]}
      />
    </Space>
  );
}
