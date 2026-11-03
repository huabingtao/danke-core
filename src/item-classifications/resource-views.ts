import { BadRequestException } from '@nestjs/common';
const icon = (name: string) => `/uploads/item-icons/categories/${name}.png`;
export const FLAT_CATEGORIES = [
  { id: 'core', name: '核心', icon: icon('core') },
  { id: 'equipment', name: '装备', icon: icon('equipment') },
  { id: 'agent', name: '特工', icon: icon('agent-avatar') },
  { id: 'pet', name: '宠物', icon: icon('pet-avatar') },
  { id: 'tech', name: '配件', icon: icon('drone') },
  { id: 'collection', name: '收藏品', icon: icon('legendary-collectible') },
  { id: 'vehicle', name: '载具', icon: icon('vehicle-avatar') },
  { id: 'key', name: '钥匙', icon: icon('key') },
  { id: 'general', name: '其他', icon: icon('general') },
  { id: 'event', name: '活动货币', icon: icon('event') },
];
export const RESOURCE_VIEWS = [
  { id: 'all', name: '全部', categoryIds: [] as string[], icon: null },
  ...FLAT_CATEGORIES.map((category) => ({
    id:
      category.id === 'core'
        ? 'cores'
        : category.id === 'key'
          ? 'keys'
          : category.id,
    name: category.name,
    categoryIds: [category.id],
    icon: category.icon,
  })),
];
export const RESOURCE_VIEW_IDS = RESOURCE_VIEWS.map((view) => view.id);
export function resourceView(id = 'all') {
  const view = RESOURCE_VIEWS.find((entry) => entry.id === id);
  if (!view) throw new BadRequestException('未知资源维度');
  return view;
}
export function resourceViewWhere(id = 'all') {
  const view = resourceView(id);
  return view.categoryIds.length
    ? { categories: { some: { categoryId: { in: view.categoryIds } } } }
    : {};
}
export function preferenceViewKey(id = 'all') {
  resourceView(id);
  return id === 'all' ? 'yield-matrix' : `yield-matrix:${id}`;
}
