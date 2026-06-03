# 公选课选课系统 - 前端

基于 Vue 3 + Vite + Element Plus 的公选课选课系统前端项目。

## 技术栈

- Vue 3 (Composition API)
- Vite 6
- Element Plus
- Pinia (状态管理)
- Vue Router
- Axios

## 功能特性

### 用户功能
- 用户登录/登出
- 浏览课程列表
- 搜索课程
- 选课/退课
- 查看选课记录

### 管理员功能
- 用户管理（增删改查）
- 课程管理（增删改查）
- 选课管理（查看）

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 环境变量

创建 `.env` 文件：

```env
VITE_API_URL=https://your-supabase-function-url/api-v10
```

## 项目结构

```
frontend/
├── src/
│   ├── api/           # API 请求封装
│   ├── components/     # 公共组件
│   ├── router/        # 路由配置
│   ├── stores/        # Pinia 状态管理
│   ├── views/         # 页面视图
│   ├── App.vue        # 根组件
│   ├── main.js        # 入口文件
│   └── style.css      # 全局样式
├── index.html         # HTML 模板
├── package.json       # 项目配置
├── vite.config.js     # Vite 配置
└── .env               # 环境变量
```

## 测试账户

- 学生：`student` / `TestPass123`
- 管理员：`admin` / `TestPass123`
