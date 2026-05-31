import {
  BarChartOutlined,
  DashboardOutlined,
  FolderAddOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Space, Tag, Typography } from "antd";
import type { MenuProps } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const items = [
  { key: "/", icon: <DashboardOutlined />, label: "工作台" },
  { key: "/products/new", icon: <FolderAddOutlined />, label: "创建商品任务" },
  { key: "/analytics", icon: <BarChartOutlined />, label: "数据看板" },
] satisfies NonNullable<MenuProps["items"]>;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey =
    items.find((item) => String(item?.key) === location.pathname)?.key?.toString() ?? "/";

  return (
    <Layout className="app-shell">
      <Layout.Sider width={232} className="side-nav">
        <Link className="brand" to="/">
          <span className="brand-mark">CS</span>
          <span>
            <strong>ClipShop AI</strong>
            <small>Seedance Commerce Studio</small>
          </span>
        </Link>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={({ key }) => navigate(key)}
          className="nav-menu"
        />
        <div className="side-status">
          <Tag color="purple">Real API</Tag>
          <Typography.Text type="secondary">
            方案审核和视频预览从工作台任务卡片进入，避免脱离具体商品上下文。
          </Typography.Text>
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className="topbar">
          <Space direction="vertical" size={0}>
            <Typography.Text type="secondary">AIGC 带货视频生成系统</Typography.Text>
            <Typography.Title level={4}>生成前审核，把黑盒变成可控创作流</Typography.Title>
          </Space>
          <Button type="primary" icon={<FolderAddOutlined />} onClick={() => navigate("/products/new")}>
            新建商品任务
          </Button>
        </Layout.Header>
        <Layout.Content className="content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
