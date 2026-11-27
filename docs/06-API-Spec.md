# 06 · 后端接口规范与多端数据持久化（API & PostgreSQL Spec）

> 基于 **Hono + TypeScript + Zod + Neon Serverless PostgreSQL**，支持 Vercel Functions（`/api/*`）与 Docker / 微信云托管（`server/Dockerfile`）双形态部署，供 **Web 家长端 / PC 管理后台 / Taro 微信小程序 / React Native App** 四端共用。

## 1. 数据库表设计 (`server/schema.sql`)

| 表名 | 核心字段与约束 | 设计目的 |
| :--- | :--- | :--- |
| `lessons` | `id (PK)`, `category`, `age_groups (JSONB)`, `published`, `lines (JSONB)`, `char_notes (JSONB)` | 支撑多端篇目筛选与逐字拼音/重点字注释读取，PC 管理后台修改后全端实时可见 |
| `children` | `id (PK)`, `streak_days`, `total_minutes`, `today_lesson_id`, `plan_lesson_ids (JSONB)`, `is_active` | 支持多孩家庭切换档案 |
| `checkins` | `id (SERIAL)`, `child_id`, `lesson_id`, `checkin_date`, `UNIQUE(child_id, checkin_date)` | 通过数据库唯一索引 + `ON CONFLICT DO NOTHING` 实现每日打卡天然幂等，防止弱网重发导致天数/分钟数重复累加 |
| `reading_progress` | `PRIMARY KEY(child_id, lesson_id)`, `line_index`, `updated_at` | 记录逐句阅读断点，跨刷新与跨端续读 |
| `hardware_devices` | `id (PK)`, `name`, `model`, `connected`, `battery`, `firmware` | 智能硬件伴读笔状态持久化 |

## 2. REST API 端点一览

所有响应在异常时均返回统一结构：`{ "code": "ERR_*", "message": "...", "retryable": boolean }`。

| 方法 | 路径 | 用途 | 关键特性 |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | 健康检查与存储模式探活 | 返回 `storage: "postgres" | "memory"` |
| `GET` | `/api/dashboard` | 获取当前孩子、今日推荐、断点进度、计划与设备状态 | 支持 `?childId=...` |
| `POST` | `/api/children/:childId/activate` | 切换当前孩子档案 | 持久化 `is_active` |
| `POST` | `/api/children/:childId/today-lesson` | 将指定篇目设为今日伴读 | 自动补入近期伴读清单 |
| `GET` | `/api/lessons` | 蒙学馆筛选 / 后台列表 | 支持 `category`, `ageGroup`, `keyword`, `includeUnpublished` |
| `GET` | `/api/lessons/:id` | 获取单篇详情及阅读断点 | 用于领读页与跨端续读 |
| `POST` | `/api/lessons` | 新增蒙学篇目 | Zod 强校验 |
| `PUT` | `/api/lessons/:id` | 更新蒙学篇目 | 即时同步四端 |
| `PATCH` | `/api/lessons/:id/publish` | 切换上架 / 下架状态 | 原子翻转 `published` |
| `DELETE` | `/api/lessons/:id` | 删除篇目 | 返回最新列表 |
| `POST` | `/api/checkins` | 提交当日伴读打卡 | 数据库唯一键幂等 + 清除该篇断点进度 |
| `PUT` | `/api/progress` | 保存逐句阅读断点 | `UPSERT` 覆盖更新 |
| `POST` | `/api/device/toggle` | 切换硬件伴读笔连接状态 | 模拟/同步设备在线状态 |
| `POST` | `/api/demo/reset` | 重置为初始示例数据 | 方便 QA 快速重置冷启动测试环境 |

## 3. 微信小程序免备案部署（微信云托管 CloudRun）

`server/Dockerfile` 已提供标准多阶段 Node 22 容器镜像，监听 `PORT=8080`：
1. 在微信公众平台开通「云托管」，关联仓库并选择 `server/Dockerfile`；
2. 配置环境变量 `DATABASE_URL`（可选，未配置时自动以内存模式运行）；
3. 在 `clients/miniprogram-taro/src/services/client.ts` 填入 `CLOUD_ENV_ID`，小程序端即可通过 `wx.cloud.callContainer` 内网直连后端，无需域名备案。
