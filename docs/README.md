# 绿色技术平台

一个致力于环保技术创新与可持续发展的现代化Web平台。

## 协作纪律（重要）

- 任何代码改动（新增/删除/修改文件、改动逻辑/样式/接口）必须先征求你的同意，并先确认改动方案后再动手修改。

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI库**: Tailwind CSS + shadcn/ui
- **开发语言**: TypeScript
- **状态管理**: URL Search Parameters (nuqs)
- **数据库**: Supabase / 
- **邮件服务**: Resend
- **版本控制**: Git + GitHub
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
│   └── H5_MOBILE_USER_GUIDE.md # H5 移动端使用指南（技术库/园区资讯库/政策库）
├── src/                       # 前端源代码
│   ├── app/                   # Next.js App Router
│   │   ├── [locale]/m/         # 移动端(H5)路由（与Web并存）
│   │   │   ├── (auth)/login/page.tsx   # 移动端登录（微信登录按钮灰底圆角 + “推荐”标识）
│   │   │   ├── (auth)/wechat/callback/page.tsx # 移动端微信登录回调页
│   │   │   ├── components/             # 移动端(H5)复用组件
│   │   │   │   └── MobileContactUsModal.tsx # H5「联系咨询」弹窗（含“允许回复推送到微信”勾选 + 提交后弹出订阅授权）
│   │   │   │   └── WeChatShareHintOverlay.tsx # 微信内分享引导（遮罩+顶部提示+指向右上角箭头）
│   │   │   ├── head.tsx                # H5 Head（预连接并预加载微信 JS-SDK 脚本，加快 window.wx 可用速度）
│   │   │   ├── hooks/                  # 移动端(H5) Hooks
│   │   │   │   └── useWeChatShare.ts   # 微信H5分享（JS-SDK签名+设置好友/群聊&朋友圈分享数据）
│   │   │   ├── layout.tsx              # 移动端共享布局（底部Tab：技术/政策/园区共用，园区入口下“消息”指向园区对接消息中心）
│   │   │   ├── page.tsx                # 移动端 Portal（左上角头像使用用户头像，入口到技术/园区/政策）
│   │   │   ├── home/page.tsx           # 移动端首页（绿色技术平台）
│   │   │   ├── chat/page.tsx           # 移动端消息中心（复用Web端接口与逻辑，H5样式重构；园区入口下分类文案为“园区对接/用户反馈”，增加请求ID防重复加载控制与登录态恢复重试）
│   │   │   ├── company-profile/page.tsx # 移动端企业信息完善（与Web逻辑一致，含Logo上传）
│   │   │   ├── policy/                 # 政策H5入口
│   │   │   │   ├── page.tsx            # 政策列表与筛选首页
│   │   │   │   ├── [id]/page.tsx       # 政策详情页（含收藏与原文链接+底部功能栏）
│   │   │   │   └── favorites/page.tsx  # 我的政策收藏列表
│   │   │   ├── parks/                  # 绿色园区H5入口（独立于政策）
│   │   │   │   ├── page.tsx            # 园区列表与筛选首页（轮播+搜索+筛选+卡片）
│   │   │   │   ├── [id]/page.tsx       # 园区详情页（基本信息/统计数据/园区政策等 + 品牌与荣誉时间轴展示 + 底部联系咨询按钮触发“园区对接”留言弹窗）
│   │   │   │   ├── rankings/page.tsx   # 园区榜单页（筛选：园区级别/榜单类型/年度；卡片可展开查看完整榜单）
│   │   │   │   ├── me/page.tsx         # 园区平台“我的”页面（入口指向园区收藏）
│   │   │   │   └── favorites/page.tsx  # 我的园区收藏列表
│   │   │   ├── me/                     # 移动端我的相关页面（技术&政策平台）
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
│   │       ├── profile/      # 用户基础信息API（头像/绑定邮箱/绑定手机号，Web+H5复用）
│   │       ├── user/         # 用户侧API
│   │       │   └── favorites/route.ts  # 用户收藏CRUD接口
│   │       ├── policy/       # 政策前台API
│   │       │   ├── list/route.ts       # 政策列表与筛选
│   │       │   ├── [id]/route.ts       # 政策详情
│   │       │   └── tags/route.ts       # 政策标签列表
│   │       ├── tech/         # 技术公共API
│   │       │   ├── category-counts/route.ts # 产业分类与子分类技术数量
│   │       │   ├── categories/route.ts      # 技术分类列表
│   │       │   ├── filter-options/route.ts  # 技术筛选选项
│   │       │   ├── search/route.ts          # 技术搜索
│   │       │   └── search-stats/route.ts    # 搜索统计数据
│   │       ├── parks/        # 园区H5相关API
│   │       │   ├── list/route.ts       # 园区列表与筛选
│   │       │   ├── rankings/route.ts   # 园区榜单（按年度/榜单类型/园区级别筛选）
│   │       │   ├── brand-directory/route.ts # 园区品牌名录（按“品牌名录名称”标签筛选）
│   │       │   ├── [id]/route.ts       # 园区详情（基础信息+统计数据）
│   │       │   ├── [id]/policies/route.ts # 园区下园区政策列表
│   │       │   └── tags/route.ts       # 园区标签列表
│   │       ├── _utils/auth.ts # API路由共享认证工具
│   │       ├── wechat/
│   │       │   ├── oauth-url/route.ts      # 生成微信网页授权URL（设置state）
│   │       │   ├── js-sdk-config/route.ts  # 生成微信 JS-SDK 签名（用于 openSubscribeMessage）
│   │       │   ├── gateway-health/route.ts # 网关连通性检测（/healthz）
│   │       │   ├── subscribe-url/route.ts  # 生成公众号订阅通知确认页URL（用于开启微信通知）
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
│   │           ├── policy/              # 政策管理API
│   │           │   ├── route.ts        # GET/POST 政策（列表、创建）
│   │           │   └── [id]/route.ts   # GET/PUT/DELETE 单条政策
│   │           ├── policy-tags/        # 政策标签管理API
│   │           │   ├── route.ts        # GET/POST 标签列表与创建
│   │           │   └── [id]/route.ts   # PUT/DELETE 单条标签
│   │           ├── parks/              # 园区管理API（列表/创建/更新/删除）
│   │           │   ├── route.ts        # GET/POST 园区（列表、创建）
│   │           │   └── [id]/route.ts   # GET/PUT/DELETE 单条园区
│   │           ├── park-brand-honors/  # 园区品牌与荣誉管理API
│   │           │   └── route.ts        # GET/POST/PUT/DELETE 品牌荣誉（支持按 parkId 或全局列表分页；含 approved_at 获批时间）
│   │           ├── park-brand-lists/   # 品牌名录类别管理API（新增）
│   │           │   └── route.ts        # GET/POST/PUT/DELETE 品牌名录类别（可在类别下维护园区名单）
│   │           ├── park-rankings/      # 园区榜单/品牌名单管理API
│   │           │   ├── lists/route.ts  # 榜单定义 CRUD
│   │           │   ├── years/route.ts  # 榜单年度 CRUD（支持设置最新/发布）
│   │           │   └── entries/route.ts# 榜单条目 CRUD（按名次关联园区）
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
│   │   ├── common/           # 通用组件
│   │   │   └── loading-overlay.tsx # 全局Loading遮罩（计数器+重置）
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
│   │   ├── safe-fetch.ts     # Fetch封装：安全Header清理 + 自动附带认证Token（优先Supabase session）
│   │   ├── utils.ts          # 通用工具函数
│   │   ├── fixed-labels.ts   # 152个固定场景标签配置与匹配工具
│   │   ├── mock-data.ts      # Mock数据
│   │   └── validators.ts     # 表单校验工具（邮箱/手机号）
│   ├── hooks/                # 自定义Hooks
│   │   ├── useAuth.ts        # 统一认证状态（Supabase / 自定义认证）
│   │   ├── useFavoritesData.ts # 收藏数据加载与状态同步
│   │   └── use-fixed-label-suggestions.ts # 自定义/固定标签智能匹配
│   └── api/                  # API调用封装
│       ├── index.ts          # API客户端基础配置
│       ├── auth.ts           # 用户认证API（包含验证码登录）
│       ├── wechat.ts         # 微信登录API（获取授权URL/换取code登录）
│       ├── tech.ts           # 技术产品API
│       ├── policy.ts         # 政策H5相关API
│       ├── parks.ts          # 园区H5相关API（列表/详情/政策/收藏）
│       ├── favorites.ts      # 用户收藏API封装
│       ├── company.ts        # 企业信息API
│       └── profile.ts        # 用户基础信息API（头像/绑定邮箱/绑定手机号，Web+H5复用）
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
│       ├── 010_create_user_favorites.sql   # 用户收藏关系表与策略
│       ├── 017_create_policy_tables.sql    # 政策与标签相关表
│       ├── 018_create_policy_favorites.sql # 政策收藏关系表与策略
│       ├── 019_extend_contact_message_category.sql # 扩展联系消息分类，支持园区对接
│       └── 020_add_parks_sort_rank.sql     # 为园区表新增排序顺位字段（园区首页默认排序用）
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

- 所有数据迁移、批量导入、清洗相关的 SQL 脚本统一放在 `data/` 目录，根目录禁止新增零散 `.sql` 迁移脚本。

### 新增/更新
- 政策H5底部导航移除“技术发布”入口，避免在 /m/policy 内展示绿色技术平台功能。
- 政策H5部委筛选默认仅展示主要部委（发改委、生态环境部、商务部、工信部、自然资源部、财政部、交通运输部、科技部），其余通过“更多”展开。
- 新增绿色园区H5独立入口 `/[locale]/m/parks` 及子页面（`/[locale]/m/parks/[id]`、`/[locale]/m/parks/me`、`/[locale]/m/parks/favorites`），共用账号体系与消息中心，但拥有独立“我的园区收藏”。
- 新增园区相关 Supabase 表 `parks`、`park_economic_stats`、`park_green_stats`、`park_tags`、`park_tag_relations`、`park_favorites`、`park_brand_honors`（由 Supabase SQL Editor 执行建表脚本）。
- 新增园区 API：`/api/parks/list`（列表与筛选）、`/api/parks/rankings`（榜单）、`/api/parks/brand-directory`（品牌名录）、`/api/parks/[id]`（园区详情）、`/api/parks/[id]/policies`（园区政策）、`/api/parks/tags`（标签）、`/api/user/park-favorites`（园区收藏）。
- 新增园区榜单/品牌名单：园区 H5 底部导航新增“榜单”入口（`/[locale]/m/parks/rankings`），管理员后台新增“榜单/品牌”菜单（`/admin/rankings`）维护榜单定义/年度/名次关联园区；数据库迁移 `supabase/migrations/022_create_park_rankings.sql` 新增 `park_rank_lists / park_rank_years / park_rank_entries`。
- 品牌名录与园区品牌荣誉打通：H5 “品牌名录” Tab 使用 `park_brand_honors` 作为数据源；管理员后台 `/admin/rankings` 先维护 `park_brand_lists`（品牌名录类别），再进入 `/admin/rankings/brands/[id]` 维护该类别下的园区名单与获批年份（写入 `park_brand_honors`，与 `/admin/parks` 的“品牌与荣誉”共享同一份数据并同步）。
- 品牌名录新增迁移：`supabase/migrations/023_add_approved_at_to_park_brand_honors.sql`（获批时间）、`supabase/migrations/024_add_sort_order_to_park_brand_honors.sql`（优先级）、`supabase/migrations/025_create_park_brand_lists.sql`（品牌名录类别，type 必填且为 6 类）、`supabase/migrations/026_enforce_park_brand_lists_type.sql`（对已有库强制补齐与校验 type）。
- 扩展轮播图支持 `scene` 字段，并通过 `/api/public/carousel?scene=home|parks` 区分技术首页与园区首页 H5 轮播；管理端轮播图页面支持按场景管理。
- 园区数据导入：已将 `/data/park_info.sql` + `/data/dict.sql` 导入并同步到 `public.parks`，但下列国家级经开区尚未匹配到 `admin_development_zones`（省份/经开区外键为空，待手动清洗匹配）：北海经济技术开发区、成都国际铁路港经济技术开发区、长春汽车经济技术开发区、广州南沙经济技术开发区、杭州湾上虞经济技术开发区、杭州余杭经济技术开发区、襄阳经济技术开发区、西青经济技术开发区、武汉临空港经济技术开发区、南昌小蓝经济技术开发区、宁波大榭开发区、宁波杭州湾经济技术开发区、宁波石化经济技术开发区、天津子牙经济技术开发区、绥化经济技术开发区、嵩明杨林经济技术开发区、上海金桥出口加工区、沈阳辉山经济技术开发区。
- 管理端新增 三级/四级 分类管理 API 与前端表单组件：支持在“产业分类管理”中对每个子分类继续维护两级子类目（无需图片）。
- 管理端技术管理表单支持选择三级/四级分类；用户端上传不涉及此两项，无需改动。
- 新增 SQL 脚本 `add-tertiary-quaternary-categories.sql`：创建 `admin_tertiary_categories`、`admin_quaternary_categories` 表，并为 `admin_technologies` 增加对应外键列。
- 新增数据清洗脚本 `data/agency_policy_clean.sql`：在原始 `data/agency_policy.sql` 的基础上去除 `content` 字段中的 HTML 标签，仅保留正文文本。
- 为适配 Supabase SQL Editor 单次脚本大小限制，将园区政策清洗结果拆分为多份脚本：`data/agency_policy_clean_part1.sql` ~ `data/agency_policy_clean_part9.sql`，其中第 4 份进一步拆分为 `data/agency_policy_clean_part4_1.sql`、`data/agency_policy_clean_part4_2.sql`、`data/agency_policy_clean_part4_3.sql`，可分批导入 `data.agency_policy`。
- 新增管理端园区管理：`/admin/parks` 页面及 `/api/admin/parks`、`/api/admin/parks/[id]` CRUD 接口，用于维护 `public.parks` 基本信息（目前仅覆盖“基本信息”版块，统计数据/政策/入驻企业/资讯等留待后续迭代）。
- 园区基础信息国际化字段：新增 SQL 脚本 `data/add-parks-english-fields.sql`，为 `public.parks` 增加多项 `*_en` 字段，并为 `public.park_brand_honors` 增加 `title_en`；管理端表单支持维护英文内容，H5 会根据 locale 优先展示英文并自动回退到中文。
- 新增脚本 `scripts/backfill-parks-en.js`：从 `public.parks` 读取中文字段，通过 OpenRouter 自动翻译并回填到对应 `*_en` 字段（支持 dry-run/limit/offset）。
- Portal（H5 `/[locale]/m`）三个入口卡片的统计数字新增聚合接口 `/api/portal/stats`，优先使用 Upstash Redis（REST）缓存并设置 CDN `Cache-Control`，减少请求次数、加快数字展示。
- 调整体系统中政策 `park_id` 语义：从指向 `admin_development_zones.id` 升级为指向 `public.parks.id`；国家级经济技术开发区园区通过 `parks.development_zone_id` 继续关联 `admin_development_zones.id`，政策列表与收藏等接口已兼容新旧两种数据。
- 删除园区联动规则：当删除级别为“国家级经济技术开发区”的园区且已绑定 `admin_development_zones` 时，同步将对应 `admin_development_zones.is_active` 置为 `false`；TODO：补充一条数据库迁移脚本，将早期 `policy.park_id = admin_development_zones.id` 的记录批量迁移至对应 `parks.id`，彻底完成语义切换。
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

## 政策与园区 H5 数据设计

### 政策主表 `policy`
- **基础字段**
  - `id`：主键（uuid）
  - `level`：政策级别（enum：`national` 国家政策 / `ministry` 部委政策 / `local` 地方政策 / `park` 园区政策）
  - `name`：政策名称
  - `summary`：简要摘要
  - `status`：政策状态（如：有效、已废止等，初期可用 `active` / `invalid` / `expired`）
  - `data_source`：数据来源渠道（爬虫、人工录入、第三方接口等）
  - `issuer`：发布机构
  - `ministry_unit`：部委单位（仅当 `level = 'ministry'` 时使用，例如：外交部、国防部、国家发展和改革委员会、教育部、科学技术部、工业和信息化部、国家民族事务委员会、公安部、国家安全部、民政部、司法部、财政部、人力资源和社会保障部、自然资源部、生态环境部、住房和城乡建设部、交通运输部、水利部、农业农村部、商务部、文化和旅游部、国家卫生健康委员会、退役军人事务部、应急部、中国人民银行，可为空）
  - `doc_number`：发文字号
  - `publish_date`：发布日期（date）
  - `effective_date`：实施日期（date，可为空）
  - `source_url`：政策原文链接（text）
- **地区 / 园区关联**
  - `region_id`：地区ID（地方政策关联地区，外键指向地区/行政区表，如 `region.id`，可为空）
  - `park_id`：园区ID（园区政策关联园区，外键指向园区表 `parks.id`，可为空；其中国家级经开区园区通过 `parks.development_zone_id` 继续关联 `admin_development_zones.id`）
- **时间元数据**
  - `uploaded_at`：上传日期（录入到系统的时间，timestamptz）
  - `modified_at`：业务修改日期（最后一次业务字段修改时间，timestamptz）
  - `created_at`：记录创建时间（默认 `now()`，timestamptz）
  - `updated_at`：记录更新时间（timestamptz）

### 政策标签表 `policy_tag`
- 用于维护可配置的政策标签（支持后台增删改）
- 建议字段：
  - `id`：主键（uuid）
  - `code`：标签编码（如 `investment`、`top_planning` 等，可选）
  - `name`：标签名称（如：招商引资、顶层规划、基础设施、产业培育、科技创新、人才政策、金融政策、绿色低碳、安全生产等）
  - `status`：启用状态（如 `active` / `disabled`）
  - `sort_order`：排序（可选）

### 政策-标签关联表 `policy_policy_tag`
- 处理政策与标签之间的多对多关系
- 建议字段：
  - `id`：主键（uuid）
  - `policy_id`：外键，关联 `policy.id`
  - `tag_id`：外键，关联 `policy_tag.id`

### 索引设计（查询与筛选）
- 为提高搜索和筛选性能，建议在以下字段上建立索引：
  - `policy(level)`
  - `policy(publish_date)`
  - `policy(region_id)`
  - `policy(park_id)`
- 如后续有“按地区/园区 + 时间范围”常用查询，可增加复合索引：
  - `policy(region_id, publish_date)`
  - `policy(park_id, publish_date)`

### 园区表说明（后续补充）
- 当前约定：
  - `parks` 表中存在唯一主键 `id`，供 `policy.park_id` 做外键关联；
  - 国家级经济技术开发区园区在 `parks` 中通过 `development_zone_id` 关联到 `admin_development_zones.id`，便于在政策列表/收藏等视图中按经开区维度展示和筛选；
  - 园区的具体业务字段（位置、类型、面积、主导产业等）将在“园区库设计”阶段再补充定义。

## 政策与园区 H5 开发计划 / TODO

> 说明：以下按阶段拆分，后续可以一项项推进；标注【需要决策】的步骤到达时再与你确认。

### 阶段 0：产品与信息结构
- [x] 0.1 梳理政策与园区 H5 的核心用户场景和功能列表（已确认：必须包含“政策浏览与搜索页”（复用现有绿色技术平台 H5 首页 UI 做适配）、“政策详情页”，以及复用现有 H5「我的」页（仅将“我的收藏”卡片改为“政策收藏”），并提供政策收藏与分享能力）
- [x] 0.2 确定移动端路由结构与入口（采用 `/[locale]/m/policy/...` 作为新系统前缀：`/[locale]/m/policy` 为政策首页入口，包含浏览与搜索；`/[locale]/m/policy/[id]` 为政策详情页；后续园区视角页面也在该前缀下扩展；同时计划在 Vercel 中为该前缀配置新的独立域名映射）

### 阶段 1：数据与迁移
- [x] 1.1 确认地区数据来源与复用方案（最新实现：地方政策的 `region_id` 统一指向 `admin_provinces.id`；园区相关政策的 `park_id` 指向 `public.parks.id`（园区表），其中国家级经济技术开发区园区通过 `parks.development_zone_id` 关联到 `admin_development_zones.id`；API 层同时兼容早期数据中 `park_id` 直接为 `admin_development_zones.id` 的情况）
- [ ] 1.2 设计园区库表结构（`park` 及相关维度字段）并补充到“园区库设计”文档（当前采用方案 A：短期不新建通用园区表，先将国家级经开区视作园区使用，待政策 H5 主功能上线后单独开迭代完成本项）
- [ ] 1.3 基于最终地区/园区方案，补充 `policy.region_id` / `policy.park_id` 的外键约束和必要索引（新增迁移脚本）
- [ ] 1.4 在 Supabase 环境执行 `017_create_policy_tables.sql` 及后续迁移，并验证表结构（仅在确认时执行）

### 阶段 2：API 设计与实现（Next.js Serverless）
- [x] 2.1 确定政策/标签相关 API 命名空间和路径规范（前台：`/api/policy/list`、`/api/policy/[id]`、`/api/policy/tags`；管理端：`/api/admin/policy`、`/api/admin/policy/[id]`、`/api/admin/policy-tags`、`/api/admin/policy-tags/[id]`；政策收藏放在用户命名空间：`/api/user/policy-favorites`）
- [x] 2.2 设计并实现“政策列表 + 筛选”接口  
      - 路径：`GET /api/policy/list`  
      - 查询参数约定：  
        - `keyword`: 关键字（匹配政策名称 / 发文字号 / 摘要）  
        - `level`: 单选政策级别（`national|ministry|local|park`）  
        - `tags`: 多选标签 ID，逗号分隔（如 `tags=uuid1,uuid2`）  
        - `ministryUnit`: 部委单位（仅当 `level = 'ministry'` 时生效；值为固定枚举列表中的中文名称，例如“外交部”、“财政部”等）  
        - `province`: 省份编码或 ID（沿用现有技术搜索接口的 `province` 约定，内部映射到 `admin_provinces.id` → `policy.region_id`）  
        - `developmentZone`: 经开区编码或 ID（沿用现有 `developmentZone` 约定，内部映射到 `admin_development_zones.id` → 关联 `parks.development_zone_id` → `policy.park_id`）  
        - `publishDateFrom` / `publishDateTo`: 发布日期范围（YYYY-MM-DD）  
        - 分页：沿用现有技术搜索接口风格：`page`（页码，从1开始）+ `pageSize`（每页条数，默认20，最大50）  
        - 排序：`sortBy`（初期支持 `publishDateDesc`【默认】、`publishDateAsc`）  
- [x] 2.3 设计并实现“政策详情”接口  
      - 路径：`GET /api/policy/[id]`  
      - 行为：根据路径参数 `id` 查询单条政策（仅返回 `status = 'active'` 的记录），并返回：  
        - 政策基本信息：`id`、`level`、`name`、`summary`、`status`、`dataSource`、`issuer`、`docNumber`、`publishDate`、`effectiveDate`、`sourceUrl`、`uploadedAt`、`modifiedAt`、`createdAt`、`updatedAt`  
        - 标签列表：从 `policy_policy_tag` + `policy_tag` 联合查询，仅返回 `status = 'active'` 的标签，结构为 `{ id, name }[]`  
        - 地区/园区信息：  
          - `province`: 从 `admin_provinces` 取 `id, name_zh/name_en, code`，映射为 `{ id, name, nameEn, code }`  
          - `developmentZone`: 从 `admin_development_zones` 取 `id, name_zh/name_en, code`，映射为 `{ id, name, nameEn, code }`
- [x] 2.4 设计并实现“标签列表”接口（面向前台 H5 使用）  
      - 路径：`GET /api/policy/tags`  
      - 行为：从 `policy_tag` 中查询所有 `status = 'active'` 的标签，按 `sort_order` 升序、`name` 升序排序，返回 `{ id, code, name }[]`
- [ ] 2.5 设计并实现管理端政策 CRUD 接口（含标签、地区、园区关联）
- [x] 2.6 设计并实现政策收藏相关 API（与现有收藏体系衔接；浏览记录留待后续迭代）  
      - 新建表 `policy_favorites`：支持 Supabase Auth 用户与 custom_auth 用户的政策收藏关系  
      - 路径：`/api/user/policy-favorites`  
        - `GET /api/user/policy-favorites?policyId=...`：检查当前登录用户是否已收藏指定政策，返回 `{ isFavorited, favoriteId, favoritedAt, policyId }`  
        - `GET /api/user/policy-favorites`：返回当前登录用户收藏的政策列表，结构与技术收藏类似，包含简要政策信息  
        - `POST /api/user/policy-favorites`：请求体 `{ policyId }`，创建或返回已有收藏记录  
        - `DELETE /api/user/policy-favorites?policyId=...` 或 body `{ policyId }`：取消收藏指定政策

### 阶段 3：H5 前端（用户端）
- [ ] 3.1 抽取并整理现有 H5 公共 UI 组件（首页布局、“我的”相关样式等），沉淀到移动端专用组件目录（当前为尽快打通功能，已在新页面内直接复用现有样式与组件，后续如需要可再抽离为 `mobile` 专用组件）
- [x] 3.2 创建政策 H5 入口及基础路由结构（已在 `/[locale]/m/policy` 下创建政策首页、`/[locale]/m/policy/[id]` 详情页及 `/[locale]/m/policy/favorites` 收藏页，并在项目结构中标注）
- [x] 3.3 接入政策列表/详情 API，完善加载中、无数据、错误状态的展示（政策首页与详情页均接入对应 API，并处理加载中与空状态文案）
- [x] 3.4 接入多选标签与政策级别筛选组件，与列表联动（政策首页提供级别单选、多标签多选、省份/经开区筛选，并与 `/api/policy/list` 联动）
- [x] 3.5 在“我的”页面中增加与政策相关的入口：将移动端“我的”页中的“我的收藏”卡片调整为“我的政策收藏”，并改为跳转到 `/[locale]/m/policy/favorites`

### 阶段 4：后台管理（Web 管理端）
- [x] 4.1 在管理端增加“政策管理”菜单与页面：支持搜索、筛选、分页、查看详情
- [x] 4.2 在管理端增加“政策编辑/创建”表单：可选择级别、地区/园区、标签、录入原文链接等
- [x] 4.3 在管理端增加“政策标签维护”页面：可增删改标签，控制启用状态与排序
- [ ] 4.4 设计并实现管理端权限控制（哪些管理员账号可管理政策/标签模块，如何在导航中展示）【需要决策】

### 阶段 5：测试与上线准备
- [ ] 5.1 梳理并补充必要日志与监控（如记录数据来源 data_source、管理员操作日志等）
- [ ] 5.2 在测试环境导入一批真实政策样例数据，验证查询、筛选与展示效果
- [ ] 5.3 进行 H5 性能与体验优化（首屏加载、筛选响应、移动端交互细节）
- [ ] 5.4 与现有绿色技术平台的导航和账号体系联通（确认入口位置与跳转方式）【需要决策】

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

## TODO：站内信同步公众号通知

目标：将三端（绿色技术平台 / 园区平台 / 政策平台）的用户站内消息（`internal_messages`）同步推送到微信服务号通知，点击后跳转到 H5 消息中心 `/${locale}/m/chat`。

### 已完成进展（代码已接入，待验证上线条件）

- H5「开启微信通知」入口：详情页「联系咨询」弹窗中“允许回复消息发送到我的微信”（默认勾选），点击提交后关闭弹窗并在页面底部展示官方示例 `wx-open-subscribe`（style/default 插槽模板），用户点击后弹出微信原生订阅授权面板：`src/app/[locale]/m/components/MobileContactUsModal.tsx`
- 订阅授权（H5开放标签优先）：`wx-open-subscribe`（需要 `openTagList: ['wx-open-subscribe']`）+ 服务端签名 `src/app/api/wechat/js-sdk-config/route.ts`
- 订阅确认页 URL 生成（备用）：`src/app/api/wechat/subscribe-url/route.ts`
- 发送链路：站内信写入后尝试“订阅通知发送”，失败不阻塞站内信写入（暂不启用“客服消息”降级，避免 access_token/IP 白名单带来的不确定性）：
  - `src/app/api/messages/internal/route.ts`
  - 发送实现：`src/lib/wechat/service-account.ts`

### 当前问题（阻塞）

- 网关容器内直连 `https://api.weixin.qq.com` 可能出现 `self-signed certificate`（云托管链路证书），导致无法通过传统 `access_token` 方式调通微信 OpenAPI。

### 解决方案（后续实现路径）

- 推荐（已验证可用）：启用微信云托管「开放接口服务」（云调用免鉴权），按接口文档原样调用但不传 `access_token`，并默认使用 `http://api.weixin.qq.com` 避免 TLS 证书问题。
  - 云托管控制台开启「开放接口服务」开关，并在「微信令牌权限配置」添加接口路径白名单（如 `/cgi-bin/ticket/getticket`、`/cgi-bin/message/subscribe/bizsend`）
  - 若环境由小程序开通，需给公众号做「资源复用」绑定，否则调用公众号相关接口会 `api unauthorized`

### 微信云托管网关（当前采用的集成方式）

为了确保不影响现有业务：Next.js 侧仅在配置了网关环境变量时才尝试推送，失败不阻塞站内信写入。

- Next.js 侧需要配置：
  - `WECHAT_GATEWAY_URL`：微信云托管服务的公网地址（不带末尾 `/`）
  - `WECHAT_GATEWAY_SECRET`：Vercel → 云托管的请求签名密钥（用于 HMAC 校验）
  - `WECHAT_H5_ORIGIN`（可选）：订阅通知“查看详情”的跳转域名兜底（当未配置 `TECH_H5_ORIGIN`/`PARK_H5_ORIGIN`/`POLICY_H5_ORIGIN` 且请求来自管理端域名时使用）
  - 以及模板字段映射：
    - `WECHAT_SUBSCRIBE_TEMPLATE_ID`
  - `WECHAT_SUBSCRIBE_TITLE_KEY`（例如 `thing1`）
  - `WECHAT_SUBSCRIBE_CONTENT_KEY`（例如 `thing4`）
  - `WECHAT_SUBSCRIBE_TIME_KEY`（例如 `time2`，可选）
  - `WECHAT_SUBSCRIBE_REMARK_KEY`（例如 `thing5`，可选；用于展示平台：绿色园区平台/绿色技术平台/绿色政策平台）
  - `WECHAT_SUBSCRIBE_INQUIRY_KEY`（例如 `thing14`，可选，用于展示用户留言内容）
  - 注意：微信模板关键词（如 `thing14`）通常有长度限制；过长会导致发送失败，需截断或在 H5 详情页查看完整内容
  - 注意：订阅通知的“查看详情”入口取决于发送时是否带 `url`/`miniprogram`；且跳转域名需在公众号后台配置为“业务域名”，并建议使用 `https`（例如仅配置了 `gtech.greendev.org.cn` 时，发送的 `url` 必须使用该域名；可通过 `WECHAT_H5_ORIGIN=https://gtech.greendev.org.cn` 兜底）
- 网关需要实现接口：
  - `POST /wechat/subscribe-send`
    - 入参：`{ openId, templateId, data, url?, scene? }`
    - 校验 Header：`x-wechat-gateway-ts` + `x-wechat-gateway-signature`
    - `signature = HMAC_SHA256(secret, ts + "." + rawBodyJson)`（hex）
  - `POST /wechat/js-sdk-config`
    - 入参：`{ url }`（完整页面URL，需去掉 `#` 后的 hash）
    - 出参：`{ appId, timestamp, nonceStr, signature }`
    - 校验 Header：同上（签名同样基于 rawBodyJson）

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

**绿色技术平台** - 推动环保技术创新，共建可持续发展的未来 
