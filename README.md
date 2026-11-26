# 启蒙小笺（MengXue Companion）

> 🌐 **在线体验（Live Demo）**：[https://mengxue-companion.vercel.app](https://mengxue-companion.vercel.app)

面向 **3–8 岁儿童家长** 的每日 5 分钟国学蒙学伴读应用，包含 **家长端移动端 H5/PWA、微信小程序胶囊避让态、轻量 PC 运营管理后台** 以及 **UI & QA 多端验收面板**。

## 核心特性

- **贴合真实育儿场景**：宣纸暖白护眼配色、`28px` 楷体逐字注音、点击重点字弹出「家长白话讲法与亲子互动提问」、智能伴读笔状态联动。
- **工程化全状态覆盖**：每个页面内置 `正常 / 骨架屏加载 / 弱网 2.5s / 空态引导 / 接口报错重试 / 离线缓存` 六态模拟，内置 `AbortController` 请求防竞态、退出进度保留与打卡幂等保护。
- **UI & QA 多端验收面板**：桌面端右侧实时切换 `iPhone 15 Pro`、`iPhone SE (375×667)`、`微信小程序胶囊态` 与 `PC 管理后台`，支持一键开启**设计标注透视层**（安全区、8pt 间距、≥44pt 触控热区、字号层级）。
- **前后端联动闭环**：在 PC 管理后台新增、编辑或上下架篇目，切回家长端移动端立即实时生效。

## 本地运行与测试

```bash
npm install
npm run dev        # 启动开发服务器（默认 http://localhost:5173）
npm run typecheck  # TypeScript 严格模式检查
npm test           # 运行 Vitest 单元测试
npm run build      # 生产构建（输出到 dist/）
```

## 部署说明

- **Vercel**：关联仓库后使用默认 Vite 预设（Build Command: `npm run build`，Output Directory: `dist`）。
- **GitHub Pages / 静态托管**：已配置 `base: './'`，可直接发布 `dist/` 目录。

## 工程与设计文档 (`docs/`)

- [01-PRD-and-UserFlow.md](docs/01-PRD-and-UserFlow.md) — 产品场景拆解、核心链路与多端返回栈规范
- [02-State-Matrix.md](docs/02-State-Matrix.md) — 全页面 6 态与极限边界处理矩阵
- [03-Design-System.md](docs/03-Design-System.md) — 色彩对比度、字号阶梯、8pt 规范与多端安全区适配
- [design-tokens.json](docs/design-tokens.json) — W3C 格式 Design Tokens（可直接导入 Figma / MasterGo）
- [04-Architecture-and-Postmortem.md](docs/04-Architecture-and-Postmortem.md) — 架构分层、避坑清单与线上问题复盘
