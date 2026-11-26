# 04 · 技术架构与线上问题排查复盘（Architecture & Postmortem）

> 前端分层架构、移动端体验避坑清单与典型线上故障复盘记录。

## 1. 工程架构概览

- **技术栈**：React 19 + TypeScript（`strict: true`、`noUnusedLocals`、`noUnusedParameters`）+ Vite 6 + 原生 CSS Custom Properties + Vitest。
- **分层职责**：
  - `src/types/domain.ts`：强类型领域模型与显式异步状态机 `AsyncState<T>`（`idle | loading | empty | error | success`）。
  - `src/services/api.ts` + `storage.ts`：统一的异步数据服务层，隔离存储（`localStorage` + Node 内存降级）并支持 6 种网络模拟态注入。
  - `src/hooks/useAsyncData.ts`：内置 `AbortController` 自动取消、800ms 慢网检测 (`isSlow`) 与一键 `retry()`。
  - `src/hooks/useSpeechReader.ts`：基于 `window.speechSynthesis` 的中文语速领读 Hook，并内置平滑计时器自动降级方案。
  - `src/components/inspector/`：面向设计工程评审的桌面调试工作台（设备壳、状态注入、设计标注透视）。

## 2. 移动端专项避坑与防线清单

1. **搜索与切换竞态（Race Condition）**：用户快速输入关键词或连续切换 Tab 时，旧请求可能晚于新请求返回导致数据倒灌。本项目在 `useAsyncData` 中为每次请求绑定独立 `AbortController`，依赖变化或组件卸载时立即 `abort()`。
2. **`100dvh` 替代 `100vh`**：移动端浏览器地址栏展开时 `100vh` 会把底部伴读操作坞顶出视口，项目全量采用 `100dvh` + `flex: 1` 内部滚动容器（`.scroll-y`）。
3. **防连点与乐观更新回滚**：打卡按钮在 `submittingCheckIn` 期间禁用防重复提交，后端逻辑按当天日期做幂等去重；「设为今日」先乐观更新 UI 提升响应感，若接口报错立即回滚并弹出 Toast。
4. **iOS / 静音设备语音兼容**：部分 WebView 或静音设备会拒绝或静默失败 `speechSynthesis`，`useSpeechReader` 捕获 `onerror` 与不支持场景后自动降级为节拍进度条，保证伴读流程不卡死。

---

## 3. 移动端典型线上故障复盘与工程防线

以下 3 类移动端高频线上隐患均已在本项目工程实现中给出对应防线：

### 案例 A：iOS Safari / 微信 H5 底部操作栏被遮挡 & 横向轻微滚动
- **现象**：上线后部分 iPhone SE 和全面屏用户在微信内打开，发现底部「完成打卡」按钮被安全区横条挡住一半，页面还能左右晃动 4px。
- **根因排查**：外层用了固定 `100vh` 未扣减浏览器底栏高度，且未配置 `viewport-fit=cover` 与 `env(safe-area-inset-bottom)`；卡片内部一个长英文副标题未设 `min-width: 0` 撑开了 Flex 子项。
- **修复与防线**：改为 `100dvh` + Flex 列布局固定头尾、`padding-bottom: calc(12px + var(--safe-bottom))`；所有文本容器加 `min-width: 0` 与 `.line-clamp-*`；并在工作台加入 `iPhone SE (375×667)` 模式作为上线前自检必选项。

### 案例 B：弱网下家长连点导致列表串行覆盖与重复打卡
- **现象**：家长在地下室/地铁弱网下搜索篇目，连续改关键词后列表闪回成旧结果；或者完成页连点两次打卡导致分钟数翻倍。
- **根因排查**：旧的 `fetch` 回调没有取消机制（后发请求先到、先发请求后到）；打卡按钮没有 `pending` 态锁。
- **修复与防线**：统一在 `useAsyncData` 接入 `AbortController` 取消前序请求；Mutation 操作加按钮锁 + 服务端/存储层按 `(childId, todayKey)` 做幂等校验，并在本项目中通过 `api.test.ts` 单测固化回归验证。

### 案例 C：家长阅读中切后台或误触返回，进度丢失
- **现象**：带娃中途被叫走或误左滑返回，再点进来又要从第一句重新翻。
- **根因排查**：仅把 `lineIndex` 存在组件局部 `useState` 中，组件卸载即销毁。
- **修复与防线**：每次切句即时写入轻量持久层 `saveReadingProgressSync`，并拦截返回动作弹出「保存进度并退出 / 继续伴读」确认抽屉；首页读取进度展示「上次读到第 X/Y 句，继续今日伴读」。
