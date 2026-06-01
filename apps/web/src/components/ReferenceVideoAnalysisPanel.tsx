import { Alert, Descriptions, Empty, Space, Tag, Typography } from "antd";
import type { ReferenceVideo } from "@clipshop/shared";
import { ReferenceVideoSceneTimeline } from "./ReferenceVideoSceneTimeline";

type Props = {
  video: ReferenceVideo;
};

const sourcePlatformCopy: Record<ReferenceVideo["sourcePlatform"], string> = {
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

export function ReferenceVideoAnalysisPanel({ video }: Props) {
  const analysis = video.analysis;

  return (
    <Space direction="vertical" size={16} className="full-width">
      <div className="surface">
        <Descriptions column={{ xs: 1, md: 2 }} size="small">
          <Descriptions.Item label="来源平台">{sourcePlatformCopy[video.sourcePlatform]}</Descriptions.Item>
          <Descriptions.Item label="来源类型">{sourceTypeCopy[video.sourceType]}</Descriptions.Item>
          <Descriptions.Item label="来源声明">{video.sourceNote ?? "未填写"}</Descriptions.Item>
          <Descriptions.Item label="类目">{video.category}</Descriptions.Item>
          <Descriptions.Item label="关键词">
            <Space wrap>
              {video.keywords.length ? video.keywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>) : "暂无"}
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </div>

      {video.analysisStatus === "failed" ? (
        <Alert type="error" showIcon message="分析失败" description={video.errorMessage ?? "请稍后重新分析。"} />
      ) : null}
      {video.analysisStatus === "pending" || video.analysisStatus === "running" ? (
        <Alert
          type="info"
          showIcon
          message={video.analysisStatus === "pending" ? "待分析" : "分析中"}
          description="分析完成后会展示摘要、Hook、卖点、风格、CTA 和分镜时间轴。"
        />
      ) : null}

      {analysis ? (
        <>
          <div className="surface">
            <Typography.Title level={3}>拆解报告</Typography.Title>
            <Descriptions column={{ xs: 1, md: 2 }} size="small">
              <Descriptions.Item label="摘要">{analysis.summary}</Descriptions.Item>
              <Descriptions.Item label="Hook 手法">{analysis.hookType}</Descriptions.Item>
              <Descriptions.Item label="风格">{analysis.style}</Descriptions.Item>
              <Descriptions.Item label="CTA 类型">{analysis.ctaType}</Descriptions.Item>
              <Descriptions.Item label="卖点">
                <Space wrap>
                  {analysis.sellingPoints.map((point) => (
                    <Tag color="blue" key={point}>
                      {point}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="关键词">
                <Space wrap>
                  {analysis.keywords.map((keyword) => (
                    <Tag key={keyword}>{keyword}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </div>
          <div className="surface">
            <Typography.Title level={3}>分镜时间轴</Typography.Title>
            <ReferenceVideoSceneTimeline scenes={analysis.scenes} />
          </div>
        </>
      ) : (
        <div className="surface">
          <Empty description="暂无结构化拆解报告" />
        </div>
      )}
    </Space>
  );
}

