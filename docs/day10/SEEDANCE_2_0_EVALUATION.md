# Seedance 2.0 能力评估说明

> Agent C 输出，Day 10 P1 交付物。

---

## 1. 当前实现：Seedance 1.5 Pro

当前比赛使用 Seedance 1.5 Pro 模型，能力边界：

```text
单张 first_frame 图片输入
文本 prompt 驱动视频生成
支持 720p / 1080p 分辨率
支持 9:16 / 16:9 画面比例
最大时长约 12-15 秒
```

图片输入限制：

```text
只支持 1 张图片作为 first_frame
不支持多张参考图
不支持商品外观锁定
不支持角色一致性约束
```

---

## 2. Seedance 2.0 增强能力

Seedance 2.0（待发布/评估中）预期增强：

```text
多参考图输入：可传入多张商品/场景参考图
更强商品一致性：商品外观在多分镜间保持一致
角色一致性：人物角色在不同场景中保持外观一致
更长视频：支持更长的视频生成
更高分辨率：支持 4K 输出
```

---

## 3. 当前方案与 2.0 的关系

Day 10 实现：

```text
Seedance 1.5 Pro + 单张 first_frame
商品外观通过文本 prompt 描述约束
多分镜一致性通过 VisualBible prompt 注入保障
```

未来 2.0 增强：

```text
多张商品参考图直接传入
分镜间商品外观自动保持一致
减少对 prompt 描述的依赖
```

---

## 4. 迁移评估

```text
Day 10 不迁移模型
当前实现不依赖 2.0 特有能力
迁移到 2.0 只需修改 buildCreateTaskBody 的 content 数组
前端和后端逻辑不需要大改
```

---

## 5. 结论

```text
当前比赛实现：Seedance 1.5 Pro 单张 first_frame，稳定可靠
未来增强方向：评估 Seedance 2.0 多参考图能力
Day 10 不迁移，不影响当前演示
```
