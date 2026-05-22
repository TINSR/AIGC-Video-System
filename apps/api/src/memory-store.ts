import type { CreativePlan, Material, GenerationTask } from '@shared/types';

// Day 1 共享内存存储（数据库实现后替换）
// 所有模块通过这两个 Map 读写同一条数据，保证端到端链路贯通

export const planStore = new Map<string, CreativePlan>();
export const taskStore = new Map<string, GenerationTask>();

// 渲染任务关联的素材快照（retry 时需要）
export const taskMaterialsStore = new Map<string, Material[]>();
