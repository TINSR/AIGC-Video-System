import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CreativePlanPage } from "./pages/CreativePlanPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { ProductNewPage } from "./pages/ProductNewPage";
import { ReviewPage } from "./pages/ReviewPage";
import { TaskPage } from "./pages/TaskPage";
import { VideoPage } from "./pages/VideoPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "products/new", element: <ProductNewPage /> },
      { path: "products/:productId/materials", element: <MaterialsPage /> },
      { path: "products/:productId/creative-plan", element: <CreativePlanPage /> },
      { path: "creative-plans/:planId/review", element: <ReviewPage /> },
      { path: "tasks/:taskId", element: <TaskPage /> },
      { path: "videos/:videoId", element: <VideoPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
