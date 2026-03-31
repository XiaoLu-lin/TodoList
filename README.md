# ToDoList Web 项目

一个轻量的 ToDoList 单页应用，当前版本已从纯前端 `localStorage` 方案升级为 **前后端一体的本地持久化版本**。

- 前端：原生 HTML / CSS / JavaScript
- 后端：Node.js + Express
- 存储：本地 JSON 文件（`data/todos.json`）

目标是：**尽量保留原有页面和交互体验，同时把数据读写迁移到后端 API。**

---

## A. 改了什么

1. **新增 Node.js 后端服务**
   - 增加 `server.js`
   - 提供 Todo CRUD API
   - 同时托管静态前端页面

2. **持久化从 localStorage 改为后端文件存储**
   - 数据落盘到 `data/todos.json`
   - 浏览器刷新后仍保留
   - 不再以 `localStorage` 作为主存储

3. **前端改为通过 API 读写数据**
   - 首屏加载调用 `GET /api/todos`
   - 新增调用 `POST /api/todos`
   - 编辑/切换完成状态调用 `PUT /api/todos/:id`
   - 删除调用 `DELETE /api/todos/:id`

4. **保留原有 UI 风格与核心交互**
   - 页面布局、统计卡片、筛选、编辑、删除、完成切换保留
   - 补充了简单的“同步状态”提示，方便判断是否已连上后端

---

## B. 目录结构

```bash
.
├── app.js             # 前端逻辑（通过 API 操作待办）
├── data/
│   └── todos.json     # 本地文件持久化数据（首次启动自动创建）
├── index.html         # 页面结构
├── package.json       # 项目依赖与启动脚本
├── README.md
├── server.js          # Express 后端 + 静态文件服务
└── styles.css         # 页面样式
```

---

## C. 如何启动前后端

> 当前版本是 **单服务启动**：启动一个 Node 服务即可，同时提供前端页面和后端 API。

### 1）安装依赖

```bash
cd /home/yin/.openclaw/workspace-lhl/projects/todolist
npm install
```

### 2）启动服务

```bash
npm start
```

默认访问地址：

```bash
http://localhost:4173
```

### 3）数据文件

首次启动后会自动创建：

```bash
data/todos.json
```

---

## D. 接口概览

### 1. 健康检查

```http
GET /api/health
```

返回示例：

```json
{ "ok": true }
```

### 2. 获取待办列表

```http
GET /api/todos
```

返回示例：

```json
[
  {
    "id": "uuid",
    "title": "整理需求文档",
    "completed": false,
    "createdAt": 1774958100000,
    "updatedAt": 1774958100000
  }
]
```

### 3. 新增待办

```http
POST /api/todos
Content-Type: application/json
```

请求体：

```json
{ "title": "整理需求文档" }
```

### 4. 更新待办

```http
PUT /api/todos/:id
Content-Type: application/json
```

可更新字段：

```json
{ "title": "更新后的标题", "completed": true }
```

### 5. 删除待办

```http
DELETE /api/todos/:id
```

成功返回：

```http
204 No Content
```

---

## E. 后续还能怎么扩展

1. **存储升级**
   - 当前用 JSON 文件，适合单机快速落地
   - 下一步可升级到 SQLite，更稳妥，便于查询和扩展

2. **批量能力**
   - 批量清理已完成
   - 全部标记完成 / 恢复

3. **更多字段**
   - 截止日期
   - 优先级
   - 标签 / 分类
   - 备注

4. **多端与账号体系**
   - 增加用户体系
   - 支持不同用户隔离数据
   - 增加登录鉴权

5. **工程化完善**
   - 补充接口测试 / 前端单元测试
   - 增加 ESLint / Prettier
   - 增加 Docker 启动方式
   - 增加环境变量和配置文件

---

## 当前实现结论

这个版本适合做首版本地可运行交付：

- 改动小
- 启动简单
- 不引入复杂基础设施
- 已完成前后端分层
- 后续迁移到 SQLite / 数据库也比较顺滑
