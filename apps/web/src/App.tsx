import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { Spin } from "antd";
import { AppShell } from "./components/AppShell";

const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })));
const CreativePlanPage = lazy(() =>
  import("./pages/CreativePlanPage").then((module) => ({ default: module.CreativePlanPage }))
);
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const MaterialsPage = lazy(() => import("./pages/MaterialsPage").then((module) => ({ default: module.MaterialsPage })));
const ProductNewPage = lazy(() =>
  import("./pages/ProductNewPage").then((module) => ({ default: module.ProductNewPage }))
);
const ReviewPage = lazy(() => import("./pages/ReviewPage").then((module) => ({ default: module.ReviewPage })));
const TaskPage = lazy(() => import("./pages/TaskPage").then((module) => ({ default: module.TaskPage })));
const VideoPage = lazy(() => import("./pages/VideoPage").then((module) => ({ default: module.VideoPage })));

function lazyPage(element: ReactNode) {
  return <Suspense fallback={<Spin fullscreen />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: lazyPage(<DashboardPage />) },
      { path: "products/new", element: lazyPage(<ProductNewPage />) },
      { path: "products/:productId/materials", element: lazyPage(<MaterialsPage />) },
      { path: "products/:productId/creative-plan", element: lazyPage(<CreativePlanPage />) },
      { path: "creative-plans/:planId/review", element: lazyPage(<ReviewPage />) },
      { path: "tasks/:taskId", element: lazyPage(<TaskPage />) },
      { path: "videos/:videoId", element: lazyPage(<VideoPage />) },
      { path: "analytics", element: lazyPage(<AnalyticsPage />) },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
