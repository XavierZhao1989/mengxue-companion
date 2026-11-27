# 启蒙小笺 · 微信小程序端（Taro 4 + React + TypeScript）

## 1. 本地编译与微信开发者工具调试

```bash
cd clients/miniprogram-taro
npm install
npm run dev:weapp   # 输出到 clients/miniprogram-taro/dist/
```

1. 在微信公众平台注册**个人主体微信小程序**（免费）拿到 `AppID`；
2. 修改 `project.config.json` 中的 `"appid"` 为你的真实 `AppID`；
3. 打开 **微信开发者工具** → 导入目录 `clients/miniprogram-taro`；
4. 本地/体验版调试时：在开发者工具右上角「详情 → 本地设置」勾选 **不校验合法域名**，即可直接请求 `https://mengxue-companion.vercel.app/api`。

## 2. 正式上线免备案方案（微信云托管 CloudRun）

个人主体小程序正式发布时，微信要求 `request` 域名必须 ICP 备案。如需**零备案直接发布正式版**：
1. 在微信公众平台左侧菜单开通「云托管」（基于根目录 `server/Dockerfile` 一键构建部署后端服务）；
2. 将 `src/services/client.ts` 中的 `CLOUD_ENV_ID` 填入你的云托管环境 ID；
3. 重新执行 `npm run build:weapp` 并上传代码提交审核，**服务类目选择「工具 > 效率 / 信息查询」**（个人主体合规过审）。
