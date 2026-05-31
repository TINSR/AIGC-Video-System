import type { Material } from '@shared/types';

/** Day11: only user-confirmed primary or AI-tagged product_primary — never usage_scene by default. */
export function selectFirstFrameMaterial(materials: Material[]): Material | undefined {
  const images = materials.filter((m) => m.type === 'image');
  const confirmed = images.find((m) => m.isPrimary);
  if (confirmed) return confirmed;
  return images.find((m) => m.role === 'product_primary');
}
