import { Alert, Button, Empty, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ReferenceVideo } from "@clipshop/shared";
import { ReferenceVideoImportForm } from "../components/ReferenceVideoImportForm";
import { api } from "../services/api";

const statusCopy: Record<ReferenceVideo["analysisStatus"], { text: string; color: string }> = {
  pending: { text: "待分析", color: "default" },
  running: { text: "分析中", color: "blue" },
  success: { text: "分析完成", color: "green" },
  failed: { text: "分析失败", color: "red" }
};

const platformCopy: Record<ReferenceVideo["sourcePlatform"], string> = {
  douyin_shop: "抖音电商",
  tiktok_shop: "TikTok Shop",
  instagram: "Instagram",
  facebook: "Facebook",
  merchant_upload: "商家上传",
  other: "其他"
};

const sourceTypeCopy: Record<ReferenceVideo["sourceType"], string> = {
  merchant_owned: "商家自有",
  licensed_public: "已授权公开视频",
  public_reference: "公开视频参考"
};

export function ReferenceVideoLibraryPage() {
  const [videos, setVideos] = useState<ReferenceVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [platform, setPlatform] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [category, setCategory] = useState("");
  const [keyword, setKeyword] = useState("");

  const loadVideos = async () => {
    setLoading(true);
    setError(undefined);
    try {
      setVideos(await api.getReferenceVideos());
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载参考视频库失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVideos();
  }, []);

  const filteredVideos = useMemo(
    () =>
      videos.filter((video) => {
        if (platform && video.sourcePlatform !== platform) return false;
        if (status && video.analysisStatus !== status) return false;
        if (category && !video.category.includes(category)) return false;
        if (keyword && !video.keywords.some((item) => item.includes(keyword))) return false;
        return true;
      }),
    [category, keyword, platform, status, videos]
  );

  const columns: ColumnsType<ReferenceVideo> = [
    {
      title: "标题",
      dataIndex: "title",
      render: (title, record) => <Link to={`/reference-videos/${record.id}`}>{title}</Link>
    },
    {
      title: "来源平台",
      dataIndex: "sourcePlatform",
      render: (value: ReferenceVideo["sourcePlatform"]) => platformCopy[value]
    },
    {
      title: "来源类型",
      dataIndex: "sourceType",
      render: (value: ReferenceVideo["sourceType"]) => sourceTypeCopy[value]
    },
    { title: "类目", dataIndex: "category" },
    {
      title: "关键词",
      dataIndex: "keywords",
      render: (keywords: string[]) => (
        <Space wrap>
          {keywords.map((item) => (
            <Tag key={item}>{item}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: "分析状态",
      dataIndex: "analysisStatus",
      render: (value: ReferenceVideo["analysisStatus"]) => <Tag color={statusCopy[value].color}>{statusCopy[value].text}</Tag>
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      render: (value: string) => new Date(value).toLocaleString()
    }
  ];

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Reference Library</Typography.Text>
          <Typography.Title level={2}>参考视频库</Typography.Title>
          <Typography.Paragraph>
            导入可直接播放的参考视频 URL 或商家自有视频，只保存结构化拆解报告，不复刻、不混剪参考视频。
          </Typography.Paragraph>
        </div>
        <Button onClick={() => void loadVideos()}>刷新列表</Button>
      </section>

      <ReferenceVideoImportForm onCreated={loadVideos} />

      <div className="surface">
        <Space direction="vertical" size={16} className="full-width">
          {error ? <Alert type="error" showIcon message="参考视频库接口失败" description={error} /> : null}
          {!error && videos.length === 0 && !loading ? (
            <Alert type="info" showIcon message="当前没有参考视频。开发占位不会伪造接口成功，请连接 Day12 后端后导入。" />
          ) : null}
          <Space wrap>
            <Select
              allowClear
              placeholder="平台筛选"
              style={{ width: 180 }}
              value={platform}
              onChange={setPlatform}
              options={Object.entries(platformCopy).map(([value, label]) => ({ value, label }))}
            />
            <Select
              allowClear
              placeholder="分析状态"
              style={{ width: 160 }}
              value={status}
              onChange={setStatus}
              options={Object.entries(statusCopy).map(([value, item]) => ({ value, label: item.text }))}
            />
            <Input placeholder="类目筛选" value={category} onChange={(event) => setCategory(event.target.value)} />
            <Input placeholder="关键词筛选" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </Space>
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredVideos}
            locale={{ emptyText: <Empty description={error ? "接口失败" : "暂无参考视频"} /> }}
          />
        </Space>
      </div>
    </Space>
  );
}
