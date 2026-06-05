import { Alert, Button, Empty, Input, Select, Space, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import type { ReferenceVideo } from "@clipshop/shared";
import { ReferenceVideoCard } from "../components/ReferenceVideoCard";
import { ReferenceVideoImportModal } from "../components/ReferenceVideoImportModal";
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
  const [importModalOpen, setImportModalOpen] = useState(false);

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

  return (
    <Space direction="vertical" size={20} className="full-width">
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Reference Library</Typography.Text>
          <Typography.Title level={2}>参考视频库</Typography.Title>
          <Typography.Paragraph>
            沉淀可复用的带货视频结构、卖点节奏和剪辑灵感
          </Typography.Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setImportModalOpen(true)}
        >
          导入参考视频
        </Button>
      </section>

      <div className="surface">
        <Space direction="vertical" size={16} className="full-width">
          {error ? <Alert type="error" showIcon message="参考视频库接口失败" description={error} /> : null}

          {/* 筛选栏 */}
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

          {/* 卡片网格 */}
          {!error && videos.length === 0 && !loading ? (
            <Empty
              description={
                <div>
                  <p>暂无参考视频</p>
                  <p>导入公开可播放 URL 或上传商家自有视频，系统会生成结构化拆解报告。</p>
                </div>
              }
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setImportModalOpen(true)}
              >
                导入参考视频
              </Button>
            </Empty>
          ) : (
            <div className="reference-video-grid">
              {filteredVideos.map((video) => (
                <ReferenceVideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </Space>
      </div>

      <ReferenceVideoImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onCreated={loadVideos}
      />
    </Space>
  );
}
