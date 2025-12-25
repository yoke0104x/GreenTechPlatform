# AGENTS.md

This file provides guidance to Codex when working with code in this repository.
## 技术栈
- 前端使用Next.js技术+Tailwind CSS框架 
- 移动端H5页面开发使用React+Next.js  
- 尽量使用shadcn/ui现成的组件,加上Radix UI 和 Framer Motion
- 使用GitHub 作为代码托管平台
- 使用Upstash Redis作为边缘缓存服务
- 后端使用FastAPI
- 数据ORM使用Prisma
- 邮件服务使用Resend
- 使用Cloudflare作为CDN网络服务
- 使用Vercel进行一键部署
- 使用Open Router作为多模型AI接口
- 使用Stripe和微信支付作为安全支付服务


## 项目结构
- 每次更新完文件都需要更新项目结构目录，信息在  [README.md](/docs/README.md) 中
- 使用真实的 UI 图片，而非占位符图片（可从 Unsplash、Pexels、Apple 官方 UI 资源中选择）
- 所有调用后端服务都必须使用API，目录在src/api
- 你在进行页面开发时，可以扫描 @README.md 的项目结构，查看是否有可用的组件或工具方法
- 所有调用后端服务都必须使用API，目录在src/api
- 页面的组件嵌套不要超过三层
- 你在进行页面开发时，可以扫描 [README.md](/docs/README.md) 的项目结构，看下是否有可用的组件或者工具方法

## 限制
- 不要在前端页面中定义测试数据，所有的数据必须来自后端服务或mock接口
- 不要创建测试文档
- 每次在运行npm run dev之前征求我的同意
- 任何代码改动（新增/删除/修改文件、改动逻辑/样式/接口）必须先征求我的同意，并先与我确认改动方案后再动手修改
- 进行移动端（H5）开发时，严禁改动 Web 端页面/组件/逻辑；所有变更必须限制在 `src/app/[locale]/m` 及其子目录，或移动端复用的独立工具文件（不影响 Web 的公共模块）。
- 如确因复用导致需要调整会影响 Web 行为的公共代码（例如共享 API、组件或工具函数），必须提前告知并征求同意，在 PR 描述中明确影响范围与回滚方案。




## Development Commands

### Frontend (Next.js)
- **Development**: `npm run dev` - Start Next.js development server **⚠️ 重要：执行此命令前必须先询问用户**
- **Build**: `npm run build` - Build production-ready application  
- **Production**: `npm start` - Start production server
- **Lint**: `npm run lint` - Run ESLint for code quality

### Database Operations
- **Supabase**: Default development database (PostgreSQL)

## Architecture Overview

### Hybrid Full-Stack Application
- **Frontend**: Next.js 14 with App Router + TypeScript
- **Backend**: Spring Boot 3.2.5 + Java 17
- **UI**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (dev) / HuaweiCloud RDS (prod)
- **Authentication**: Supabase Auth with JWT + SMS verification
- **State Management**: URL Search Parameters (nuqs)

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components organized by feature
- `src/api/` - Frontend API client functions
- `backend/src/main/java/com/greentech/platform/` - Spring Boot application
- `docs/` - Project documentation and setup guides

### Authentication Flow
1. **SMS Verification**: Primary login method with 60-second cooldown
2. **Password Login**: Secondary method with email/phone support
3. **WeChat Login**: Third-party authentication option
4. **Supabase Integration**: Handles user sessions and JWT tokens

### Data Management
- **Company Profiles**: 3-tier location selection (Country → Province → Economic Zone)
- **Technology Categories**: 2-level categorization with filtering
- **Economic Zones**: 232 national-level zones with complete province mapping
- **Search & Filter**: Advanced filtering with sorting capabilities

## Development Practices

### Next.js Conventions
- Use App Router structure with `page.tsx` files
- Mark client components with `'use client'` directive
- Prefer Server Components (RSC) over client components
- Directory names: kebab-case, component files: PascalCase
- Use named exports instead of default exports

### Backend Standards
- Follow Spring Boot best practices and conventions
- Use JPA entities for database mapping
- Implement proper exception handling with GlobalExceptionHandler
- API responses use standardized ApiResponse format
- Support multiple database profiles (dev/huaweicloud)

### Code Quality Requirements
- Maintain single responsibility principle for components
- Use TypeScript interfaces for all data structures
- Handle loading states and error conditions
- Implement proper form validation with Zod
- Follow established naming conventions and file structure

### Environment Configuration
- Frontend: `.env.local` with Supabase credentials
- Backend: Profile-specific YAML files (dev/prod/test)
- Database switching via Spring profiles
- SMS service integration with verification codes

## Testing Strategy
- Backend unit tests with Maven
- Frontend linting with ESLint
- Database connection testing scripts
- Health check endpoints for monitoring
