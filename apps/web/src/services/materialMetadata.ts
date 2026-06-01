import type { Material } from "@clipshop/shared";

export type MaterialRole = "product_primary" | "product_detail" | "usage_scene" | "packaging" | "other";

export type MaterialWithAiMetadata = Material & {
  materialRole?: MaterialRole;
  role?: MaterialRole;
  aiRole?: MaterialRole;
  aiConfidence?: number;
  confidence?: number;
  roleConfidence?: number;
  aiReason?: string;
  recommendationReason?: string;
  roleReason?: string;
  isPrimary?: boolean;
  isFirstFrame?: boolean;
  confirmedPrimary?: boolean;
};

const roleCopy: Record<MaterialRole, string> = {
  product_primary: "商品主图",
  product_detail: "商品细节",
  usage_scene: "使用场景",
  packaging: "包装图",
  other: "其他"
};

export function getPrimaryStorageKey(productId: string) {
  return `clipshop.primaryMaterial.${productId}`;
}

export function getMaterialRole(material: Material): MaterialRole {
  const source = material as MaterialWithAiMetadata;
  return source.materialRole ?? source.role ?? source.aiRole ?? "other";
}

export function getMaterialRoleLabel(material: Material) {
  return roleCopy[getMaterialRole(material)];
}

export function getMaterialConfidence(material: Material): number | undefined {
  const source = material as MaterialWithAiMetadata;
  const raw = source.aiConfidence ?? source.confidence ?? source.roleConfidence;
  if (typeof raw !== "number" || Number.isNaN(raw)) return undefined;
  return raw > 1 ? Math.round(raw) : Math.round(raw * 100);
}

export function getMaterialReason(material: Material) {
  const source = material as MaterialWithAiMetadata;
  return source.aiReason ?? source.recommendationReason ?? source.roleReason;
}

export function isBackendPrimary(material: Material) {
  const source = material as MaterialWithAiMetadata;
  return Boolean(source.isPrimary ?? source.isFirstFrame ?? source.confirmedPrimary);
}

export function pickPrimaryMaterialId(materials: Material[], storedId?: string | null) {
  if (storedId && materials.some((material) => material.id === storedId)) return storedId;
  const backendPrimary = materials.find(isBackendPrimary);
  if (backendPrimary) return backendPrimary.id;
  const aiPrimary = materials.find((material) => material.type === "image" && getMaterialRole(material) === "product_primary");
  if (aiPrimary) return aiPrimary.id;
  return materials.find((material) => material.type === "image")?.id;
}

