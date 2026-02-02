# Follow Back X - 需求文档

## 1. 项目概述

Chrome 扩展，在 X (Twitter) 的「正在关注」页面识别未互关用户（未显示「关注了你」标签），并用红色背景高亮其操作按钮，便于用户决定是否回关。

**目标页面**：`https://x.com/{username}/following`

---

## 2. 技术栈

| 类型 | 选型 |
|------|------|
| 框架 | Plasmo |
| UI | Shadcn UI + Tailwind CSS |
| 状态 | Zustand |
| 请求/缓存 | TanStack Query |
| 图标 | Tabler Icons |

---

## 3. 功能需求

### 3.1 核心功能

- **页面注入**：仅在 X 的 `*/following`（正在关注）页面注入 Content Script。
- **DOM 识别**：
  - 定位列表中的每个「用户卡片/行」。
  - 判断该用户是否带有「关注了你」文案（或对应 i18n 文案，如 "Follows you"）。
- **高亮规则**：
  - 若**没有**「关注了你」标签 → 该用户对应的操作按钮（如关注/已关注按钮）设为**红色背景**。
  - 若有「关注了你」→ 不修改样式。
- **交互**：不改变原有点击行为，仅增加视觉高亮。

### 3.2 可选/后续

- 统计并展示「未回关的正在关注」数量（如 Popup 或 Content 内小浮层）。
- 支持多语言（「关注了你」/ "Follows you" 等）的文案匹配。

---

## 4. 非功能需求与约束

### 4.1 打包与性能

- **体积**：控制 Popup 与 Content 的打包体积，保证 Popup 打开速度。
- **依赖**：避免引入过大的库（如大型图表库）；如必须使用，需确认 Tree Shaking 生效，并只打包用到的组件/API。

### 4.2 样式隔离

- **Content Script**：必须使用 **Shadow DOM** 挂载 UI（若扩展在页面上渲染自定义组件）。
- **Tailwind**：在 Content 中使用的 Tailwind 样式需限定在 Shadow DOM 内，避免污染 x.com 原有样式；Plasmo 默认对 Content 的隔离要确认并保持。

### 4.3 持久化与 Background

- **Service Worker**：Background 脚本（Service Worker）不常驻，会随浏览器策略被回收。
- **禁止**：在 React 组件外使用全局变量保存业务数据。
- **必须**：所有需要跨会话或跨页面使用的数据，一律使用持久化存储（如 `chrome.storage.local` / `chrome.storage.sync` 或 Plasmo 封装的 Storage API）。

---

## 5. 页面与脚本职责

| 部分 | 职责 |
|------|------|
| **Content Script** | 在 following（正在关注）页扫描 DOM，识别「关注了你」、给对应用户按钮加红色背景；若需浮层 UI，放在 Shadow DOM 内。 |
| **Popup** | 可选：展示统计、设置开关、说明；保持轻量。 |
| **Background** | 可选：需要时做与 X API 或存储相关的逻辑；所有状态写入 Storage，不依赖内存变量。 |

---

## 6. 风险与注意点

- **DOM 结构变更**：X 前端可能改版，选择器需考虑可维护性（如优先用可读的 data 属性或相对稳定的结构），必要时做多版本选择器兼容或配置化。
- **速率限制**：若后续增加接口请求（如统计），需遵守 X 的访问频率限制，避免账号或 IP 被限流。
- **隐私**：仅在用户已打开的 following 页面上做 DOM 读取与样式修改，不主动上传用户列表到第三方。

---

## 7. 验收标准（简要）

1. 在 `https://x.com/{username}/following` 打开页面后，未显示「关注了你」的用户，其对应按钮显示红色背景。
2. 显示「关注了你」的用户样式不变。
3. Content 样式不影响 x.com 其他区域（通过 Shadow DOM 或等效隔离保证）。
4. Popup 打开无明显卡顿；无在 Background 中用全局变量存业务数据的实现。
