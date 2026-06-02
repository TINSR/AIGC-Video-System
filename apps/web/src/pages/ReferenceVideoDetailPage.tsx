import { Alert, Button, Empty, Select, Space, Spin, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Product, ReferenceVideo } from "@clipshop/shared";
import { ReferenceVideoAnalysisPanel } from "../components/ReferenceVideoAnalysisPanel";
import { api } from "../services/api";

const statusCopy: Record<ReferenceVideo["analysisStatus"], { text: string; color: string }> = {
  pending: { text: "待分析", color: "default" },
  running: { text: "分析中", color: "blue" },
  success: { text: "分析完成", color: "green" },
  failed: { text: "分析失败", color: "red" }
};

export function ReferenceVideoDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<ReferenceVideo>();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadDetail = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [nextVideo, nextProducts] = await Promise.all([api.getReferenceVideo(id), api.getProducts().catch(() => [])]);
      setVideo(nextVideo);
      setProducts(nextProducts);
      setSelectedProductId((current) => current ?? nextProducts[0]?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载参考视频详情失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [id]);

  const analyze = async () => {
    setAnalyzing(true);
    setError(undefined);
    try {
      setVideo(await api.analyzeReferenceVideo(id));
      messageApi.success("参考视频分析已提交");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "分析失败";
      setError(messageText);
      messageApi.error(messageText);
    } finally {
      setAnalyzing(false);
    }
  };

  const useAsReference = () => {
    if (!video || !selectedProductId) return;
    navigate(`/products/${selectedProductId}/creative-plan?referenceVideoId=${video.id}`);
  };

  if (loading) return <Spin fullscreen />;

  return (
    <Space direction="vertical" size={20} className="full-width">
      {contextHolder}
      <section className="section-heading">
        <div>
          <Typography.Text type="secondary">Reference Report</Typography.Text>
          <Typography.Title level={2}>{video?.title ?? "参考视频详情"}</Typography.Title>
          {video ? <Tag color={statusCopy[video.analysisStatus].color}>{statusCopy[video.analysisStatus].text}</Tag> : null}
        </div>
        <Space wrap>
          <Link to="/reference-videos">
            <Button>返回参考视频库</Button>
          </Link>
          <Button type="primary" loading={analyzing} disabled={!video} onClick={analyze}>
            {video?.analysisStatus === "success" || video?.analysisStatus === "failed" ? "重新分析" : "开始分析"}
          </Button>
        </Space>
      </section>

      {error ? <Alert type="error" showIcon message={error} /> : null}
      {video ? (
        <>
          <div className="surface">
            <Space direction="vertical" size={12} className="full-width">
              <Alert
                type="info"
                showIcon
                message="用作剧本参考只会传递 referenceVideoId 到具体商品流程，不创建全局状态。"
                description="当前页面不会复制原视频字幕全文，也不会提供混剪原视频入口。"
              />
              <Space wrap>
                <Select
                  placeholder="选择商品"
                  style={{ width: 260 }}
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  options={products.map((product) => ({ value: product.id, label: product.title }))}
                />
                <Button disabled={!selectedProductId || video.analysisStatus !== "success"} onClick={useAsReference}>
                  用作剧本参考
                </Button>
              </Space>
            </Space>
          </div>
          <ReferenceVideoAnalysisPanel video={video} />
        </>
      ) : (
        <div className="surface">
          <Empty description="未找到参考视频" />
        </div>
      )}
    </Space>
  );
}
