# 启蒙小笺（MengXue Companion）

> 🌐 **在线体验（Live Demo）**：[https://mengxue-companion.vercel.app](https://mengxue-companion.vercel.app)

面向 **3–8 岁儿童家长** 的每日 5 分钟国学蒙学伴读全栈四端项目，包含 **家长端 Web / H5、PC 运营管理后台、Node.js + TypeScript 后端服务（PostgreSQL）、Taro（React + TS）微信小程序端** 与 **React Native（Expo）iOS / Android App 端**。

## 架构总览

- **Web 家长端 & PC 运营后台**（`src/`）：React 19 + TypeScript + Vite，内置 **UI & QA 多端验收面板**（`iPhone 15 Pro` / `iPhone SE 375×667` / `微信小程序胶囊态` / `PC 管理后台`、6 种状态注入与设计标注透视层）。
- **后端服务 & 数据库**（`api/` + `server/`）：Hono + TypeScript + Zod + `@neondatabase/serverless`（PostgreSQL），支持 Vercel Serverless Functions（`/api/*`）与 Docker / 微信云托管（`server/Dockerfile`）零备案部署；未配置 `DATABASE_URL` 时自动优雅降级为内存仓储。
- **微信小程序端**（`clients/miniprogram-taro/`）：Taro 4（React + TypeScript），自适应微信右上角原生胶囊，支持 HTTPS 与 `wx.cloud.callContainer` 双通道及本地离线缓存。
- **移动端 App**（`clients/mobile-rn/`）：React Native + Expo（TypeScript），集成系统中文 TTS 领读（`expo-speech`）、触觉反馈（`expo-haptics`）、安全区适配与 EAS Android APK / iOS 构建配置。

## 本地运行与测试

```bash
npm install
npm run dev        # 启动前端开发服务器（http://localhost:5173）
npm run api:dev    # 启动本地 Node.js API（http://localhost:8080，Vite 已自动代理 /api）
npm run typecheck  # 前后端双端 TypeScript 严格模式检查
npm test           # 运行 Vitest 单元测试（含服务端 API 路由测试）
npm run build      # 生产构建（输出到 dist/）
```

## 工程与设计文档 (`docs/`)

- [01-PRD-and-UserFlow.md](docs/01-PRD-and-UserFlow.md) — 产品场景拆解、核心链路与多端返回栈规范
- [02-State-Matrix.md](docs/02-State-Matrix.md) — 全页面 6 态与极限边界处理矩阵
- [03-Design-System.md](docs/03-Design-System.md) — 色彩对比度、字号阶梯、8pt 规范与多端安全区适配
- [design-tokens.json](docs/design-tokens.json) — W3C 格式 Design Tokens（可直接导入 Figma / MasterGo）
- [04-Architecture-and-Postmortem.md](docs/04-Architecture-and-Postmortem.md) — 架构分层、避坑清单与线上问题复盘
- [06-API-Spec.md](docs/06-API-Spec.md) — REST API 规范、PostgreSQL 表设计与云托管容器部署指南
