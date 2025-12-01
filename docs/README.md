# 绿色技术平台

一个致力于环保技术创新与可持续发展的现代化Web平台。

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI库**: Tailwind CSS + shadcn/ui
- **开发语言**: TypeScript
- **状态管理**: URL Search Parameters (nuqs)
- **后端**: Java + Spring Boot
- **数据库**: Supabase / 华为云RDS
- **邮件服务**: Resend
- **版本控制**: Git + GitHub

## 项目结构

```
├── .cursor/                    # Cursor编辑器规则配置
│   └── rules/                 # 开发规范文件
├── .git/                      # Git版本控制
├── backend/                   # 后端服务目录
│   ├── application-huaweicloud.yml  # 华为云RDS配置
│   ├── docs/HUAWEICLOUD_RDS_SETUP.md  # 华为云RDS配置指南
│   ├── test-huaweicloud-rds.bat      # Windows测试脚本
│   └── test-huaweicloud-rds.sh       # Linux/Mac测试脚本
├── docs/                      # 项目文档
├── src/                       # 前端源代码
│   ├── app/                   # Next.js App Router
│   │   ├── [locale]/m/         # 移动端(H5)路由（与Web并存）
│   │   │   ├── (auth)/login/page.tsx   # 移动端登录
│   │   │   ├── (auth)/wechat/callback/page.tsx # 移动端微信登录回调页
│   │   │   ├── layout.tsx              # 移动端共享布局（底部Tab）
│   │   │   ├── page.tsx                # 重定向到 /home
│   │   │   ├── home/page.tsx           # 移动端首页
│   │   │   ├── chat/page.tsx           # 移动端消息中心（复用Web端接口与逻辑，H5样式重构）
│   │   │   ├── company-profile/page.tsx # 移动端企业信息完善（与Web逻辑一致，含Logo上传）
│   │   │   ├── me/                     # 移动端我的相关页面
│   │   │   │   ├── page.tsx            # 移动端我的
│   │   │   │   ├── company/page.tsx    # 移动端我的-企业信息（Logo可上传与展示）
│   │   │   │   ├── feedback/page.tsx   # 移动端我的-问题反馈
│   │   │   │   ├── technologies/page.tsx # 移动端我的-技术发布（搜索、发布、列表、加载更多）
│   │   │   │   └── technologies/[id]/page.tsx # 移动端我的-技术详情
│   │   ├── globals.css       # 全局样式文件
│   │   ├── layout.tsx        # 根布局组件
│   │   ├── page.tsx          # 首页组件
│   │   ├── privacy-policy/   # 隐私条款页面
│   │   │   └── page.tsx      # 隐私条款页面组件
│   │   ├── company-profile/  # 企业信息完善页面
│   │   │   └── page.tsx      # 企业信息完善页面组件
│   │   └── api/              # API路由
│   │       ├── auth/         # 认证相关API
│   │       ├── company/      # 企业信息相关API
│   │       ├── user/         # 用户侧API
│   │       │   └── favorites/route.ts  # 用户收藏CRUD接口
│   │       ├── tech/         # 技术公共API
│   │       │   ├── category-counts/route.ts # 产业分类与子分类技术数量
│   │       │   ├── categories/route.ts      # 技术分类列表
│   │       │   ├── filter-options/route.ts  # 技术筛选选项
│   │       │   ├── search/route.ts          # 技术搜索
│   │       │   └── search-stats/route.ts    # 搜索统计数据
│   │       ├── _utils/auth.ts # API路由共享认证工具
│   │       ├── wechat/
│   │       │   ├── oauth-url/route.ts      # 生成微信网页授权URL（设置state）
│   │       │   └── callback/route.ts       # 微信回调：换取openid/用户信息并登录
│   │       ├── messages/
│   │       │   └── internal/
│   │       │       ├── route.ts              # 站内信API：GET列表 / POST发送（支持自定义用户+微信推送）
│   │       │       ├── unread-count/route.ts # 获取未读站内信数量
│   │       │       ├── mark-read/route.ts    # 批量/单条标记为已读
│   │       │       ├── mark-all-read/route.ts# 标记全部站内信为已读
│   │       │       └── delete/route.ts       # 批量删除站内信
│   │       │   └── contact/route.ts          # 用户联系咨询/问题反馈的创建与查询
│   │       └── admin/        # 管理后台API
│   │           ├── tertiary-categories/   # 三级分类管理API（新增）
│   │           │   ├── route.ts           # GET/POST 三级分类
│   │           │   └── [id]/route.ts      # PUT/DELETE 三级分类
│   │           ├── quaternary-categories/ # 四级分类管理API（新增）
│   │           │   ├── route.ts           # GET/POST 四级分类
│   │           │   └── [id]/route.ts      # PUT/DELETE 四级分类
│   │           ├── upload/             # 管理端上传接口
│   │           │   ├── route.ts        # 管理端文件上传（支持图片与技术资料文档）
│   │           │   └── delete/route.ts # 管理端删除上传文件
│   │           └── wipo-scraper/   # WIPO数据抓取与导入
│   │               ├── check-ids/route.ts     # 批量校验输入ID是否已存在
│   │               ├── check-existing/route.ts# 单条重复校验（导入前对比）
│   │               ├── scrape/route.ts        # 单条抓取
│   │               ├── process/route.ts       # 本地处理与拼装
│   │               ├── import/route.ts        # 单条导入（包含图片、国家、公司Logo处理）
│   │               └── batch-import/route.ts  # 批量导入（复用导入逻辑）
│   ├── components/            # React组件
│   │   ├── ui/               # shadcn/ui基础组件
│   │   │   └── button.tsx    # 按钮组件
│   │   ├── layout/           # 布局组件
│   │   │   ├── header.tsx    # 头部导航
│   │   │   └── footer.tsx    # 底部组件
│   │   ├── auth/             # 认证组件
│   │   │   ├── auth-modal.tsx        # 登录注册弹窗
│   │   │   ├── register-form.tsx     # 注册表单
│   │   │   └── verification-login-form.tsx # 手机验证码登录表单
│   │   └── home/             # 首页组件
│   │       ├── hero-section.tsx      # 英雄区域
│   │       ├── product-categories.tsx # 产品分类
│   │       ├── search-filter.tsx     # 搜索筛选（支持二级分类筛选）
│   │       ├── search-results.tsx    # 搜索结果
│   │       └── floating-actions.tsx  # 浮动操作按钮
│   ├── lib/                  # 工具库
│   │   ├── custom-auth.ts    # 自定义认证工具（密码哈希、JWT生成、令牌校验等）
│   │   ├── utils.ts          # 通用工具函数
│   │   ├── fixed-labels.ts   # 152个固定场景标签配置与匹配工具
│   │   ├── mock-data.ts      # Mock数据
│   │   └── validators.ts     # 表单校验工具（邮箱/手机号）
│   ├── hooks/                # 自定义Hooks
│   │   ├── useFavoritesData.ts # 收藏数据加载与状态同步
│   │   └── use-fixed-label-suggestions.ts # 自定义/固定标签智能匹配
│   └── api/                  # API调用封装
│       ├── index.ts          # API客户端基础配置
│       ├── auth.ts           # 用户认证API（包含验证码登录）
│       ├── wechat.ts         # 微信登录API（获取授权URL/换取code登录）
│       ├── tech.ts           # 技术产品API
│       ├── favorites.ts      # 用户收藏API封装
│       └── company.ts        # 企业信息API
├── package.json              # 项目依赖配置
├── scripts/
│   ├── parse-green-taxonomy.js   # 解析 docs/green-taxo.md，生成结构化产业分类JSON
│   ├── import-green-taxonomy.js  # 调用管理端API批量创建新的四级技术分类体系
│   ├── cleanup-old-taxonomy.js   # 批量解绑技术旧标签并删除遗留分类树
│   ├── backfill-wipo-check-ids.js # 根据现有技术描述提取WIPO ID并批量调用 check-ids 触发回填
│   ├── sql/
│   │   └── update-taxonomy-translations.sql # 批量更新三级/四级分类英文名+默认图片
│   ├── playwright/
│   │   ├── crawl-nbc-business.js     # 示例：使用 Playwright 抓取 NBC Business
│   │   └── scrape-wipo-article.js    # 使用 Playwright 抓取 WIPO Green 技术详情页
│   └── mcp/
│       └── run-mcp-tool.js   # 通用 MCP 客户端脚本（可调用 Firecrawl MCP，不依赖Claude）
├── supabase/
│   └── migrations/           # Supabase数据库迁移脚本
│       └── 010_create_user_favorites.sql  # 用户收藏关系表与策略
├── next.config.mjs          # Next.js配置
├── tsconfig.json            # TypeScript配置
├── tailwind.config.ts       # Tailwind CSS配置
├── postcss.config.js        # PostCSS配置
├── public/                  # 静态资源目录
│   └── images/             # 图片资源
│       ├── icons/          # 图标文件
│       │   ├── wechat-icon.png  # 微信登录图标
│       │   └── README.md        # 图标使用说明
│       ├── auth/           # 认证页面图片
│       │   ├── welcome-image.png # 欢迎图片
│       │   └── README.md        # 认证图片使用说明
│       ├── logo/           # Logo文件
│       ├── categories/     # 分类图片
│       └── hero/           # 首页背景图片
└── README.md                # 项目说明文档

### 数据处理脚本

```

### 新增/更新
- 管理端新增 三级/四级 分类管理 API 与前端表单组件：支持在“产业分类管理”中对每个子分类继续维护两级子类目（无需图片）。
- 管理端技术管理表单支持选择三级/四级分类；用户端上传不涉及此两项，无需改动。
- 新增 SQL 脚本 `add-tertiary-quaternary-categories.sql`：创建 `admin_tertiary_categories`、`admin_quaternary_categories` 表，并为 `admin_technologies` 增加对应外键列。
middle_process_scripts/      # 中间处理脚本暂存目录（可按需迁移脚本）
```
```

## 开发规范

### 架构原则
- 使用 Next.js App Router 结构
- 客户端组件需明确标记 `'use client'`
- 优先使用服务器组件(RSC)
- 遵循组件单一职责原则

### 命名约定
- 目录名使用 kebab-case (`components/auth-form`)
- 组件文件使用 PascalCase (`Button.tsx`)
- 优先使用命名导出而非默认导出

### 样式规范
- 使用 Tailwind CSS 实用工具类
- 遵循移动优先的响应式设计
- 利用 shadcn/ui 组件系统
- 使用 CSS 变量实现主题系统

### API 调用
- 所有后端调用统一放在 `src/api` 目录
- 使用 TypeScript 接口定义数据类型

### 数据库配置
- **开发环境**: 默认使用 Supabase PostgreSQL
- **生产环境**: 支持华为云RDS MySQL
- **配置切换**: 通过 `spring.profiles.active` 参数切换
  - `dev`: 使用 Supabase 配置
  - `huaweicloud`: 使用华为云RDS配置
- 统一的错误处理机制

## 安装和运行

### 1. 安装依赖
```bash
npm install
```

### 2. 环境配置
创建 `.env.local` 文件：
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 启动开发服务器
```bash
npm run dev
```

### 4. 构建生产版本
```bash
npm run build
npm start
```

## Firecrawl 集成（不使用 Claude）

- 脚本：`scripts/mcp/run-mcp-tool.js` 使用 `@modelcontextprotocol/sdk` 以 `stdio` 方式直连本地/全局 MCP 服务器可执行文件。
- 适用于 Firecrawl MCP 或其它 MCP 服务器，完全不依赖 Claude。

### 环境变量
- `FIRECRAWL_API_KEY`: Firecrawl API Key（必需，若 MCP/HTTP 端要求）
- `FIRECRAWL_BASE_URL`: Firecrawl API 基地址（可选，默认官方地址）
- `FIRECRAWL_MCP_COMMAND`: MCP 服务器可执行命令（如已全局安装的 `firecrawl-mcp`）
- `FIRECRAWL_MCP_ARGS`: 传给 MCP 可执行命令的参数（JSON 数组字符串），如 `["--transport","stdio"]`

### 使用示例
1) 列出可用工具
```bash
FIRECRAWL_API_KEY=... \
FIRECRAWL_MCP_COMMAND="firecrawl-mcp" \
node scripts/mcp/run-mcp-tool.js --list
```

2) 调用具体工具（示例工具名：`firecrawl_extract`，参数从 JSON 文件读取）
```bash
FIRECRAWL_API_KEY=... \
FIRECRAWL_MCP_COMMAND="firecrawl-mcp" \
node scripts/mcp/run-mcp-tool.js \
  --tool firecrawl_extract \
  --params ./data/firecrawl-params.json
```

注：`firecrawl-mcp` 为示意名，请根据你本机安装的 Firecrawl MCP 可执行名称/路径进行替换，或使用 `--command` 与 `--args` 手动指定。

## 可用组件

### 布局组件
- `Header` - 网站头部导航组件
- `Footer` - 网站底部组件

### 认证组件
- `AuthModal` - 登录注册弹窗组件
- `RegisterForm` - 注册表单组件

### 页面组件
- `PrivacyPolicy` - 隐私条款页面组件

### 首页组件
- `HeroSection` - 英雄区域组件
- `ProductCategories` - 产品分类组件
- `SearchFilter` - 搜索筛选组件（支持二级分类筛选）
- `SearchResults` - 搜索结果组件
- `FloatingActions` - 浮动操作按钮组件

### UI组件
- `Button` - 按钮组件，支持多种变体和尺寸

### API服务
- `apiClient` - 统一的API调用客户端
- `authApi` - 用户认证相关API
- `techApi` - 技术产品相关API

## 开发指南

1. **组件开发**: 在 `src/components` 目录下创建新组件
2. **页面开发**: 在 `src/app` 目录下创建路由页面
3. **API集成**: 在 `src/api` 目录下添加API调用
4. **样式开发**: 使用 Tailwind CSS 类名和CSS变量
5. **类型定义**: 为所有数据结构定义TypeScript接口
6. **Mock数据**: 在 `src/lib/mock-data.ts` 中添加测试数据

## 更新记录

### 2025年9月

- 修复：管理员后台 `/admin/users` 分页只显示前10条的问题，改为后端合并后统一分页，支持完整翻页。
- 同步：管理员在 `/admin/users` 修改用户邮箱/手机号后，同步到：
  - 用户个人中心 `/[locale]/profile`（通过拉取最新 Supabase 用户信息避免会话缓存）
  - 若该用户已关联企业，则同步到 `admin_companies.contact_email/phone`
- 体验：用户端 `/[locale]/user/companies` 表单默认显示账号的邮箱/手机号，保存时写回后端，确保与管理端一致。

### 2025年8月

- **用户导航栏优化**：
  - 登录后，右上角的用户头像将显示为默认用户图标。
  - 用户名将显示为用户在公司资料中注册的公司名称，而不是“测试用户”。

### 2024年12月

**国家级经开区数据更新**（基于CSV字典表）：
- 根据官方CSV字典表完整更新232个国家级经开区数据
- 创建经开区数据文件 (`src/lib/economic-zones-data.ts`)
- 更新搜索筛选页面和企业信息完善页面的省份-经开区联动
- 数据覆盖全国31个省、直辖市、自治区的完整经开区列表
- 确保省份与经开区的准确对应关系
- **企业信息完善页面**：
  - 新增企业信息完善页面 (`/company-profile`)
  - 包含需求选择下拉框：发布技术、寻找技术、了解动态
  - 企业名称输入框和企业Logo上传功能（可选）
  - 国别、省份、经开区三级联动选择，支持地区筛选
  - 省份选择仅在国别为"中国"时可用
  - 经开区选择与省份联动，包含232个国家级经济技术开发区数据
  - 完整的表单验证和API集成
  - 文件上传支持，包含上传状态提示
  - 创建企业信息相关API接口 (`/api/company/*`)
  - Mock数据包含完整的国家、省份、经开区数据

- **手机验证码登录功能**：
  - 新增手机验证码登录表单组件（verification-login-form.tsx）
  - 实现手机号码输入框，支持国家代码选择（默认+86）
  - 实现验证码输入框，集成获取验证码按钮和60秒倒计时功能
  - 创建发送验证码API（/api/auth/send-code）和验证码登录API（/api/auth/verify-code）
  - 支持验证码格式验证（6位数字）和手机号码格式验证
  - 集成API调用，实现完整的验证码登录流程
  - 添加表单验证和错误处理机制
  - 支持从验证码登录返回账号登录的功能切换
  - 添加隐私条款勾选框，默认勾选状态，取消勾选时登录按钮变为灰色不可用
  - 添加灰色分隔线和微信扫码登录图标及文字，与账号登录页面保持一致
  - 将"其他登录方式"改为"密码登录"链接，居左展示，与账号登录页面的"手机验证码登录"链接样式一致

- **登录注册弹窗功能**：
  - 新增登录注册弹窗组件，支持在现有页面上弹出
  - 严格按照设计图片实现左侧登录表单
  - 标题"账号登录"位置向上调整，注册提示"没有账号? 免费注册"
  - 手机号/邮箱和密码输入框，支持密码显示/隐藏切换
  - 使用lucide-react的Eye/EyeOff图标，提供更好的视觉体验
  - "忘记密码?"链接，去掉复选框"下次自动登录"
  - 统一使用绿色主题（#00b899）的链接和登录按钮
  - 右侧使用浅蓝色背景，展示绿盟logo和平台名称
  - 右侧布局：logo在左侧，文字在右侧，水平对齐显示
  - 右侧显示：绿盟logo.png图片（48x48）+ "国家级经开区绿色技术产品推广平台" + 英文副标题
  - 尺寸优化：logo和文字尺寸适中，确保在一行中良好显示
  - 弹窗高度：调整为500px，内容布局更紧凑
  - 顶部对齐：左侧登录表单和右侧logo文字都保持在页面顶部
  - 水平对齐：左侧"账号登录"标题与右侧logo+文字保持顶端对齐
  - 隐私条款：左侧添加勾选框和"我已阅读并同意《隐私条款》"链接，默认勾选状态
  - 登录控制：取消勾选隐私条款时，登录按钮变为灰色不可用状态
  - 分隔线：登录按钮下方添加"或"分隔线，用于区分不同登录方式
  - 微信图标：分隔线下方添加微信登录图标（28x28像素）和"微信扫码登录"文字，支持本地PNG文件替换
  - 右侧文字优化：中英文间距缩小，英文字号调整为10px，英文位置向上调整与中文更紧凑
  - 右侧图片：添加欢迎图片在Logo和文字下方展示，支持本地PNG文件替换（320x240像素）
  - 使用lucide-react图标库提供现代化图标

- **搜索筛选功能增强**：
  - 添加浅绿色背景和上下分区设计
  - 实现二级产业分类筛选（主分类+子分类）
  - 实现三级联动筛选（国别-省份-经开区）
  - 集成232个国家级经济技术开发区数据
  - 优化搜索框和筛选框间距布局
  - 将"相关结果"信息移至搜索结果区域
  - 企业数量和技术数量显示为蓝色粗体

- **搜索结果排序功能**：
  - 新增三种排序方式：更新时间、中文名称降序、中文名称升序
  - 每种排序方式配有对应图标（时钟、向下箭头、向上箭头）
  - 排序按钮采用现代化设计，支持激活状态显示
  - 优化排序逻辑，支持中文名称的正确排序
  - 添加updateTime字段到产品数据结构中

- **搜索结果布局重新设计**：
  - 严格按照设计图片重新布局搜索结果列表
  - 上方区域：左侧展示技术供应商中文名称和英文名称，右侧展示技术供应商LOGO
  - 下方区域：左侧展示技术简介缩略图，右侧展示技术名称和简介
  - 简介文字最多显示3行，超出部分通过"展开更多"按钮展示
  - 右下角放置"联系我们"按钮
  - 添加公司LOGO图片支持
  - 优化技术简介的展示逻辑，支持简短描述和完整描述
  - 添加line-clamp-3样式限制文本显示行数

### 国家级经开区数据
已完成以下省份的经开区数据集成：
- **北京**：2个经开区
- **天津**：6个经开区  
- **上海**：6个经开区
- **重庆**：4个经开区
- **山东**：16个经开区
- **河南**：9个经开区
- **湖北**：12个经开区
- 其他省份数据待完善

## 贡献指南

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

**绿色技术平台** - 推动环保技术创新，共建可持续发展的未来 
