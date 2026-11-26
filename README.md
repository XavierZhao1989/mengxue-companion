# 启蒙小笺（MengXue Companion）

> 🌐 **在线演示（Live Demo）**：[https://xavierzhao1989.github.io/mengxue-companion/](https://xavierzhao1989.github.io/mengxue-companion/)

面向 **3–8 岁儿童家长** 的每日 5 分钟国学蒙学伴读产品作品集（含 **家长端移动端 H5/PWA + 微信小程序避让态 + 轻量 PC 运营管理后台 + 面试演示与设计规范控制台**）。

## 核心亮点

- **贴合真实育儿场景**：宣纸暖白护眼配色、`28px` 楷体逐字注音、点击重点字弹出「家长白话讲法与亲子互动提问」、智能硬件伴读笔状态联动。
- **工程化全状态覆盖**：每个页面内置 `正常 / 骨架屏加载 / 弱网 2.5s / 空态引导 / 接口报错重试 / 离线缓存` 六态模拟，内置 `AbortController` 请求防竞态、退出进度保留与打卡幂等保护。
- **Design Engineering 演示控制台**：桌面端右侧实时切换 `iPhone 15 Pro`、`iPhone SE (375×667)`、`微信小程序胶囊态` 与 `PC 管理后台`，并支持一键开启**设计标注透视层**（安全区、8pt 间距、≥44pt 触控热区、字号层级）。
- **前后端联动闭环**：在 PC 管理后台新增、编辑或上下架篇目，切回家长端移动端立即实时生效。

## 本地运行与测试

```bash
npm install
npm run dev        # 启动开发服务器（默认 http://localhost:5173）
npm run typecheck  # TypeScript 严格模式检查
npm test           # 运行 Vitest 单元测试
npm run build      # 生产构建（输出到 dist/）
```

## 部署为在线作品集链接

本项目已配置 `base: './'`，可直接部署为静态站点用于投简历附件或微信扫码演示：
- **Vercel**：导入仓库后使用默认 Vite 预设（Build Command: `npm run build`，Output Directory: `dist`）。
- **GitHub Pages / Cloudflare Pages**：直接发布 `dist/` 目录即可。

## 配套面试与设计文档 (`docs/`)

- [01-PRD-and-UserFlow.md](docs/01-PRD-and-UserFlow.md) — 需求拆解、用户痛点、页面流程图与返回栈规则
- [02-State-Matrix.md](docs/02-State-Matrix.md) — 全页面 6 态与极限边界处理矩阵
- [03-Design-System.md](docs/03-Design-System.md) — 色彩对比度、字号阶梯、8pt 规范与多端安全区适配
- [design-tokens.json](docs/design-tokens.json) — W3C 格式 Design Tokens（可直接导入 Figma / MasterGo）
- [04-Architecture-and-Postmortem.md](docs/04-Architecture-and-Postmortem.md) — 架构分层、避坑清单与线上问题复盘模板
- [05-Interview-Pitch-Script.md](docs/05-Interview-Pitch-Script.md) — 按 JD 5 步编排的 6 分钟面试讲稿与追问应答
