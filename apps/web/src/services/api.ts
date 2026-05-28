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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.error?.message ?? "请求失败");
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
    const scene = creativePlans[0].scenes.find((item) => item.id === sceneId)!;
    return { ...scene, ...input };
  },
  async approvePlan(planId: string): Promise<CreativePlan> {
    if (!USE_MOCK) {
      return request<CreativePlan>(`/creative-plans/${planId}/approve`, { method: "POST" });
    }
    await wait();
    return { ...creativePlans[0], id: planId, status: "approved" };
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
    return generationTasks[0];
  },
  async getTask(taskId: string): Promise<GenerationTask> {
    if (!USE_MOCK) return request<GenerationTask>(`/tasks/${taskId}`);
    await wait();
    return generationTasks.find((task) => task.id === taskId) ?? generationTasks[0];
  },
  async getAnalytics(): Promise<AnalyticsOverview> {
    if (!USE_MOCK) return request<AnalyticsOverview>("/analytics/overview");
    await wait();
    return analyticsOverview;
  }
};
