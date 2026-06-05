import {
  BarChartOutlined,
  BulbOutlined,
  DashboardOutlined,
  FolderAddOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Space, Tag, Typography } from "antd";
import type { MenuProps } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const items = [
  { key: "/", icon: <DashboardOutlined />, label: "工作台" },
  { key: "/products/new", icon: <FolderAddOutlined />, label: "创建商品任务" },
  { key: "/reference-videos", icon: <VideoCameraOutlined />, label: "参考视频库" },
  { key: "/inspiration-templates", icon: <BulbOutlined />, label: "灵感模板库" },
  { key: "/analytics", icon: <BarChartOutlined />, label: "数据看板" },
] satisfies NonNullable<MenuProps["items"]>;

// 根据路由获取页面标题
function getPageTitle(pathname: string): { subtitle: string; title: string } {
  if (pathname === "/") {
    return { subtitle: "Commerce video creation", title: "商品视频任务工作台" };
  }
  if (pathname.startsWith("/creative-plans/") && pathname.includes("/review")) {
    return { subtitle: "Creative Plan Review", title: "方案审核与创作模式" };
  }
  if (pathname.startsWith("/tasks/")) {
    return { subtitle: "Task Progress", title: "任务进度与成片预览" };
  }
  if (pathname.startsWith("/reference-videos")) {
    return { subtitle: "Reference Library", title: "参考视频库" };
  }
  if (pathname.startsWith("/inspiration-templates")) {
    return { subtitle: "Inspiration Templates", title: "灵感模板库" };
  }
  if (pathname.startsWith("/analytics")) {
    return { subtitle: "Analytics Dashboard", title: "数据看板" };
  }
  if (pathname.startsWith("/products/new")) {
    return { subtitle: "Create Product", title: "创建商品任务" };
  }
  return { subtitle: "AIGC Commerce Video", title: "电商 AIGC 视频创作工作台" };
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey =
    items.find((item) => {
      const key = String(item?.key);
      return key === "/" ? location.pathname === "/" : location.pathname.startsWith(key);
    })?.key?.toString() ?? "/";

  const pageTitle = getPageTitle(location.pathname);

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
            Real API 已启用，任务数据来自真实后端。
          </Typography.Text>
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className="topbar">
          <Space direction="vertical" size={0}>
            <Typography.Text type="secondary">{pageTitle.subtitle}</Typography.Text>
            <Typography.Title level={4}>{pageTitle.title}</Typography.Title>
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
