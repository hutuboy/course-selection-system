# 公选课选课系统

基于 Supabase Edge Functions 构建的公选课选课系统。

## 在线访问

GitHub Pages: https://hutuboy.github.io/course-selection-system/

## 技术栈

- 前端: HTML + CSS + JavaScript (原生)
- 后端: Supabase Edge Functions (Deno)
- 数据库: Supabase PostgreSQL 17.6
- 认证: 自定义 JWT (HMAC-SHA256)

## API

Edge Function: `api-v9`
Base URL: `https://knenakrvlkyikwnwsxgm.supabase.co/functions/v1/api-v9`

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 教师 | teacher1~3 | 123456 |
| 学生 | student1~5 | 123456 |
