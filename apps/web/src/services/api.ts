import type {
  AnalyticsOverview,
  CreativePlan,
  GenerationTask,
  Material,
  Product,
  Scene,
  ScriptStyle
} from "@clipshop/shared";
import {
  analyticsOverview,
  creativePlans,
  generationTasks,
  materials,
  products
} from "../data/mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

// 解析静态资源 URL：/outputs 和 /uploads 需要指向 API 服务器 origin
// mock 模式下返回相对路径（同源），真实 API 模式下拼接 API origin
export function resolveAssetUrl(path: string): string {
  if (!path) return path;
  if (USE_MOCK) return path;
  // 从 API_BASE_URL 提取 origin，例如 http://localhost:3101/api -> http://localhost:3101
  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  if (path.startsWith("/outputs") || path.startsWith("/uploads")) {
    return `${apiOrigin}${path}`;
  }
  return path;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    ...init
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? `请求失败：${response.status}`);
  }
  return payload.data as T;
}

const wait = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const api = {
  async getProducts(): Promise<Product[]> {
    if (!USE_MOCK) return request<Product[]>("/products");
    await wait();
    return products;
  },
  async createProduct(input: Omit<Product, "id" | "createdAt">): Promise<Product> {
    if (!USE_MOCK) {
      return request<Product>("/products", {
        method: "POST",
        body: JSON.stringify(input)
      });
    }
    await wait();
    return {
      id: `product_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...input
    };
  },
  async getMaterials(productId: string): Promise<Material[]> {
    if (!USE_MOCK) return request<Material[]>(`/products/${productId}/materials`);
    await wait();
    return materials.filter((material) => material.productId === productId);
  },
  async uploadMaterial(productId: string, file: File): Promise<Material> {
    if (!USE_MOCK) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("tags", "上传素材");
      return request<Material>(`/products/${productId}/materials`, {
        method: "POST",
        body: formData
      });
    }
    await wait();
    const material: Material = {
      id: `material_${Date.now()}`,
      productId,
      type: file.type.startsWith("video/") ? "video" : "image",
      fileUrl: URL.createObjectURL(file),
      thumbnailUrl: file.type.startsWith("video/") ? undefined : URL.createObjectURL(file),
      title: file.name,
      tags: ["上传素材"],
      aiDescription: "",
      duration: file.type.startsWith("video/") ? 10 : undefined,
      createdAt: new Date().toISOString()
    };
    materials.unshift(material);
    return material;
  },
  async generateCreativePlan(
    productId: string,
    input: { style: ScriptStyle; merchantAdCopy: string; maxDuration: number }
  ): Promise<CreativePlan> {
    if (!USE_MOCK) {
      return request<CreativePlan>(`/products/${productId}/creative-plans/generate`, {
        method: "POST",
        body: JSON.stringify({ ...input, language: "zh-CN" })
      });
    }
    await wait(400);
    return { ...creativePlans[0], productId, style: input.style };
  },
  async getCreativePlan(planId: string): Promise<CreativePlan> {
    if (!USE_MOCK) return request<CreativePlan>(`/creative-plans/${planId}`);
    await wait();
    return creativePlans.find((plan) => plan.id === planId) ?? creativePlans[0];
  },
  async updateScene(planId: string, sceneId: string, input: Partial<Scene>): Promise<Scene> {
    if (!USE_MOCK) {
      return request<Scene>(`/creative-plans/${planId}/scenes/${sceneId}`, {
        method: "PUT",
        body: JSON.stringify(input)
      });
    }
    await wait();
    const plan = creativePlans.find((item) => item.id === planId) ?? creativePlans[0];
    const scene = plan.scenes.find((item) => item.id === sceneId) ?? plan.scenes[0];
    const updated = { ...scene, ...input };
    plan.scenes = plan.scenes.map((item) => (item.id === sceneId ? updated : item));
    return updated;
  },
  async approvePlan(planId: string): Promise<CreativePlan> {
    if (!USE_MOCK) {
      return request<CreativePlan>(`/creative-plans/${planId}/approve`, { method: "POST" });
    }
    await wait();
    const plan = creativePlans.find((item) => item.id === planId) ?? creativePlans[0];
    plan.status = "approved";
    return { ...plan, id: planId, status: "approved" };
  },
  async renderPlan(planId: string): Promise<GenerationTask> {
    if (!USE_MOCK) {
      return request<GenerationTask>(`/creative-plans/${planId}/render`, {
        method: "POST",
        body: JSON.stringify({
          provider: "seedance_1_5",
          aspectRatio: "9:16",
          withTts: true,
          withBgm: true,
          fallbackToFfmpeg: true
        })
      });
    }
    await wait();
    return { ...generationTasks[0], creativePlanId: planId };
  },
  async getTask(taskId: string): Promise<GenerationTask> {
    if (!USE_MOCK) return request<GenerationTask>(`/tasks/${taskId}`);
    await wait();
    return generationTasks.find((task) => task.id === taskId) ?? generationTasks[0];
  },
  async retryTask(taskId: string): Promise<GenerationTask> {
    if (!USE_MOCK) {
      return request<GenerationTask>(`/tasks/${taskId}/retry`, { method: "POST" });
    }
    await wait();
    const task = generationTasks.find((item) => item.id === taskId) ?? generationTasks[0];
    return {
      ...task,
      status: "pending",
      progress: 0,
      currentStep: "任务已重新创建",
      errorMessage: undefined,
      updatedAt: new Date().toISOString()
    };
  },
  async getAnalytics(): Promise<AnalyticsOverview> {
    if (!USE_MOCK) return request<AnalyticsOverview>("/analytics/overview");
    await wait();
    return analyticsOverview;
  }
};
