// 管理员Dashboard相关类型定义

/**
 * 基础实体接口
 */
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
  is_active: boolean
}

/**
 * 多语言字段接口
 */
export interface MultiLanguageField {
  name_zh: string
  name_en: string
}

/**
 * 产业分类
 */
export interface AdminCategory extends BaseEntity, MultiLanguageField {
  slug: string
  sort_order: number
  technology_count?: number
  subcategories?: AdminSubcategory[]
}

/**
 * 产业子分类
 */
export interface AdminSubcategory extends BaseEntity, MultiLanguageField {
  category_id: string
  slug: string
  sort_order: number
  technology_count?: number
  default_tech_image_url?: string // 默认技术图片URL
  category?: AdminCategory
  __isVirtual?: boolean
}

/**
 * 三级分类（隶属于二级子分类）
 */
export interface AdminTertiaryCategory extends BaseEntity, MultiLanguageField {
  subcategory_id: string
  slug: string
  sort_order: number
  technology_count?: number
  subcategory?: AdminSubcategory
}

/**
 * 四级分类（隶属于三级分类）
 */
export interface NationalEconomyMapping {
  code: string
  name: string
}

export interface AdminQuaternaryCategory extends BaseEntity, MultiLanguageField {
  tertiary_category_id: string
  slug: string
  sort_order: number
  technology_count?: number
  national_economy_code?: string
  national_economy_name?: string
  national_economy_mappings?: NationalEconomyMapping[]
}

/**
 * 国别
 */
export interface AdminCountry extends BaseEntity, MultiLanguageField {
  code: string
  logo_url?: string
  sort_order: number
  provinces?: AdminProvince[]
}

/**
 * 省份
 */
export interface AdminProvince extends BaseEntity, MultiLanguageField {
  country_id: string
  code: string
  sort_order: number
  country?: AdminCountry
  development_zones?: AdminDevelopmentZone[]
}

/**
 * 国家级经开区
 */
export interface AdminDevelopmentZone extends BaseEntity, MultiLanguageField {
  province_id: string
  code: string
  sort_order: number
  province?: AdminProvince
}

/**
 * 园区（含国家级经开区及其他类型园区）
 * 对应 public.parks 表
 */
export interface AdminPark extends BaseEntity {
  name_zh: string
  name_en?: string | null
  level?: string | null
  level_code?: string | null
  logo_url?: string | null
  sort_rank?: number | null

  province_id?: string | null
  development_zone_id?: string | null

  city?: string | null
  city_en?: string | null
  address?: string | null
  address_en?: string | null
  area_km2?: number | null
  population?: number | null
  established_date?: string | null
  website_url?: string | null
  wechat_official_account?: string | null
  leading_industries?: string | null
  leading_industries_en?: string | null
  leading_companies?: string | null
  leading_companies_en?: string | null
  alias?: string | null
  alias_en?: string | null
  dialect?: string | null
  dialect_en?: string | null
  climate?: string | null
  climate_en?: string | null
  region_desc?: string | null
  region_desc_en?: string | null
  nearby_airports?: string | null
  nearby_airports_en?: string | null
  nearby_railway_stations?: string | null
  nearby_railway_stations_en?: string | null
  famous_scenic_spots?: string | null
  famous_scenic_spots_en?: string | null
  license_plate_code?: string | null
  phone_area_code?: string | null
  postal_code?: string | null
  brief_zh?: string | null
  brief_en?: string | null
  brand_honors?: string[] | null

  // 关联数据
  province?: AdminProvince
  development_zone?: AdminDevelopmentZone
}

export type ParkBrandHonorType =
  | '综合类'
  | '生态文明类'
  | '经济发展类'
  | '外资外贸类'
  | '科技创新类'
  | '社会治理类'

export const PARK_BRAND_HONOR_TYPE_OPTIONS: { value: ParkBrandHonorType; label: string }[] = [
  { value: '综合类', label: '综合类' },
  { value: '生态文明类', label: '生态文明类' },
  { value: '经济发展类', label: '经济发展类' },
  { value: '外资外贸类', label: '外资外贸类' },
  { value: '科技创新类', label: '科技创新类' },
  { value: '社会治理类', label: '社会治理类' },
]

export interface AdminParkBrandHonor extends BaseEntity {
  park_id: string
  year?: number | null
  title: string
  title_en?: string | null
  type?: ParkBrandHonorType | null
  approved_at?: string | null
  sort_order?: number | null
  park?: AdminPark | null
}

export interface AdminParkBrandList extends BaseEntity {
  title: string
  type: ParkBrandHonorType
  sort_order?: number | null
}

export type ParkRankingKind = 'ranking' | 'brand'
export type ParkRankingParkLevel =
  | '国家级经济技术开发区'
  | '国家级高新技术产业开发区'

export interface AdminParkRankingList extends BaseEntity {
  title_zh: string
  title_en?: string | null
  park_level: ParkRankingParkLevel
  kind: ParkRankingKind
}

export interface AdminParkRankingYear extends BaseEntity {
  list_id: string
  year: number
  is_latest: boolean
  is_published: boolean
}

export interface AdminParkRankingEntry extends BaseEntity {
  year_id: string
  park_id: string
  rank: number
  park?: AdminPark | null
}

/**
 * 轮播图
 */
export interface AdminCarouselImage extends BaseEntity {
  title_zh?: string
  title_en?: string
  description_zh?: string
  description_en?: string
  image_url: string
  link_url?: string
  sort_order: number
  scene?: string | null
}

/**
 * 企业类型枚举
 */
export type CompanyType = 
  | 'state_owned_enterprise'
  | 'state_owned_company' 
  | 'private_enterprise'
  | 'private_company'
  | 'foreign_enterprise'
  | 'joint_venture'
  | 'cooperative'
  | 'individual_business'
  | 'partnership'
  | 'other'

/**
 * 企业信息
 */
export interface AdminCompany extends BaseEntity {
  name_zh: string
  name_en?: string
  logo_url?: string
  address_zh?: string
  address_en?: string
  company_type?: CompanyType
  country_id?: string
  province_id?: string
  development_zone_id?: string
  industry_code?: string
  annual_output_value?: number // 亿元
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  
  // 关联数据
  country?: AdminCountry
  province?: AdminProvince
  development_zone?: AdminDevelopmentZone
}

/**
 * 附件信息
 */
export interface TechnologyAttachment {
  url: string
  filename: string
  size?: number
  type?: string
}

/**
 * 技术来源枚举
 */
export type TechSource = 'self_developed' | 'cooperative' | 'transfer' | 'import_digest' | 'other'
// 技术获取方式
export type TechAcquisitionMethod = 'enterprise_report' | 'partner' | 'wipo' | 'japan_china_cooperation' | 'other'

/**
 * 技术审核状态枚举
 */
export type TechReviewStatus = 'published' | 'pending_review' | 'rejected'

/**
 * 技术信息
 */
export interface AdminTechnology extends BaseEntity {
  name_zh: string
  name_en?: string
  description_zh?: string
  description_en?: string
  image_url?: string
  website_url?: string
  tech_source: TechSource // 保持与数据库一致
  acquisition_method?: TechAcquisitionMethod // 技术获取方式
  brief_zh?: string
  brief_en?: string
  category_id?: string
  subcategory_id?: string
  tertiary_category_id?: string
  quaternary_category_id?: string
  custom_label?: string // 应用场景标签，不超过20字符
  featured_weight?: number // 精选排序权重，数值越大越靠前
  attachment_urls?: string[] // 为了向后兼容保留
  attachments?: TechnologyAttachment[] // 新的附件结构
  created_by?: string // 创建者用户ID
  review_status?: TechReviewStatus // 审核状态
  reject_reason?: string // 退回原因
  reviewed_by?: string // 审核人ID
  reviewed_at?: string // 审核时间
  
  // 企业关联信息
  company_id?: string
  company_name_zh?: string // 企业中文名称
  company_name_en?: string // 企业英文名称
  company_logo_url?: string // 企业logo URL
  company_country_id?: string // 企业国别ID
  company_province_id?: string // 企业省份ID
  company_development_zone_id?: string // 企业开发区ID
  
  // 关联数据
  category?: AdminCategory
  subcategory?: AdminSubcategory
  tertiary_category?: AdminTertiaryCategory
  quaternary_category?: AdminQuaternaryCategory
  company?: AdminCompany
  company_country?: AdminCountry
  company_province?: AdminProvince
  company_development_zone?: AdminDevelopmentZone
}

/**
 * 表单数据类型（用于创建和更新）
 */
export type CreateCategoryData = Omit<AdminCategory, 'id' | 'created_at' | 'updated_at' | 'subcategories'>
export type UpdateCategoryData = Partial<CreateCategoryData>

export type CreateSubcategoryData = Omit<AdminSubcategory, 'id' | 'created_at' | 'updated_at' | 'category'>
export type UpdateSubcategoryData = Partial<CreateSubcategoryData>

export type CreateCountryData = Omit<AdminCountry, 'id' | 'created_at' | 'updated_at' | 'provinces'>
export type UpdateCountryData = Partial<CreateCountryData>

export type CreateProvinceData = Omit<AdminProvince, 'id' | 'created_at' | 'updated_at' | 'country' | 'development_zones'>
export type UpdateProvinceData = Partial<CreateProvinceData>

export type CreateDevelopmentZoneData = Omit<AdminDevelopmentZone, 'id' | 'created_at' | 'updated_at' | 'province'>
export type UpdateDevelopmentZoneData = Partial<CreateDevelopmentZoneData>

export type CreateParkData = Omit<AdminPark, 'id' | 'created_at' | 'updated_at' | 'province' | 'development_zone'>
export type UpdateParkData = Partial<CreateParkData>

export type CreateCarouselImageData = Omit<AdminCarouselImage, 'id' | 'created_at' | 'updated_at'>
export type UpdateCarouselImageData = Partial<CreateCarouselImageData>

export type CreateCompanyData = Omit<AdminCompany, 'id' | 'created_at' | 'updated_at' | 'country' | 'province' | 'development_zone'>
export type UpdateCompanyData = Partial<CreateCompanyData>

export type CreateTechnologyData = Omit<AdminTechnology, 'id' | 'created_at' | 'updated_at' | 'category' | 'subcategory'>
export type UpdateTechnologyData = Partial<CreateTechnologyData>

/**
 * 用户信息
 */
export interface AdminUser {
  id: string
  email?: string
  phone_number?: string
  company_id: string
  created_at: string
  // 关联数据
  company?: Pick<AdminCompany, 'id' | 'name_zh'>
}

/**
 * API响应包装类型
 */
export interface AdminApiResponse<T> {
  data: T
  error?: string
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  scene?: string
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * 企业类型选项
 */
export const COMPANY_TYPE_OPTIONS = [
  { value: 'state_owned_enterprise', label_zh: '国有企业', label_en: 'State-owned Enterprise' },
  { value: 'private_enterprise', label_zh: '民营企业', label_en: 'Private Enterprise' },
  { value: 'foreign_enterprise', label_zh: '外资企业', label_en: 'Foreign Enterprise' },
  { value: 'other', label_zh: '其他', label_en: 'Other' }
] as const

/**
 * 技术来源选项
 */
export const TECH_SOURCE_OPTIONS = [
  { value: 'self_developed', label_zh: '自主开发', label_en: 'Self-developed' },
  { value: 'cooperative', label_zh: '合作开发', label_en: 'Cooperative Development' },
  { value: 'transfer', label_zh: '转让', label_en: 'Transfer' },
  { value: 'import_digest', label_zh: '引进消化', label_en: 'Import and Digest' },
  { value: 'other', label_zh: '其它', label_en: 'Other' }
] as const
// 技术获取方式选项
export const TECH_ACQUISITION_METHOD_OPTIONS = [
  { value: 'enterprise_report', label_zh: '企业上报', label_en: 'Enterprise Report' },
  { value: 'partner', label_zh: '合作伙伴', label_en: 'Partner' },
  { value: 'wipo', label_zh: 'WIPO', label_en: 'WIPO' },
  { value: 'japan_china_cooperation', label_zh: '日中经协', label_en: 'Japan-China Economic Association' },
  { value: 'other', label_zh: '其他', label_en: 'Other' }
] as const

/**
 * 技术审核状态选项
 */
export const TECH_REVIEW_STATUS_OPTIONS = [
  { value: 'published', label_zh: '已发布', label_en: 'Published' },
  { value: 'pending_review', label_zh: '待审核', label_en: 'Pending Review' },
  { value: 'rejected', label_zh: '已退回', label_en: 'Rejected' }
] as const

/**
 * 政策级别（与 policy.level 枚举保持一致）
 */
export type AdminPolicyLevel = 'national' | 'ministry' | 'local' | 'park'

export const POLICY_LEVEL_OPTIONS = [
  { value: 'national', label_zh: '中央政策', label_en: 'Central' },
  { value: 'ministry', label_zh: '部委政策', label_en: 'Ministry' },
  { value: 'local', label_zh: '地方政策', label_en: 'Local' },
  { value: 'park', label_zh: '园区政策', label_en: 'Park' },
] as const

/**
 * 部委单位选项（仅针对部委政策）
 */
export const POLICY_MINISTRY_UNIT_OPTIONS = [
  { value: '外交部', label_zh: '外交部', label_en: 'Ministry of Foreign Affairs' },
  { value: '国防部', label_zh: '国防部', label_en: 'Ministry of National Defense' },
  {
    value: '国家发展和改革委员会',
    label_zh: '国家发展和改革委员会',
    label_en: 'National Development and Reform Commission',
  },
  { value: '教育部', label_zh: '教育部', label_en: 'Ministry of Education' },
  { value: '科学技术部', label_zh: '科学技术部', label_en: 'Ministry of Science and Technology' },
  {
    value: '工业和信息化部',
    label_zh: '工业和信息化部',
    label_en: 'Ministry of Industry and Information Technology',
  },
  {
    value: '国家民族事务委员会',
    label_zh: '国家民族事务委员会',
    label_en: 'National Ethnic Affairs Commission',
  },
  { value: '公安部', label_zh: '公安部', label_en: 'Ministry of Public Security' },
  { value: '国家安全部', label_zh: '国家安全部', label_en: 'Ministry of State Security' },
  { value: '民政部', label_zh: '民政部', label_en: 'Ministry of Civil Affairs' },
  { value: '司法部', label_zh: '司法部', label_en: 'Ministry of Justice' },
  { value: '财政部', label_zh: '财政部', label_en: 'Ministry of Finance' },
  {
    value: '人力资源和社会保障部',
    label_zh: '人力资源和社会保障部',
    label_en: 'Ministry of Human Resources and Social Security',
  },
  { value: '自然资源部', label_zh: '自然资源部', label_en: 'Ministry of Natural Resources' },
  {
    value: '生态环境部',
    label_zh: '生态环境部',
    label_en: 'Ministry of Ecology and Environment',
  },
  {
    value: '住房和城乡建设部',
    label_zh: '住房和城乡建设部',
    label_en: 'Ministry of Housing and Urban-Rural Development',
  },
  { value: '交通运输部', label_zh: '交通运输部', label_en: 'Ministry of Transport' },
  { value: '水利部', label_zh: '水利部', label_en: 'Ministry of Water Resources' },
  {
    value: '农业农村部',
    label_zh: '农业农村部',
    label_en: 'Ministry of Agriculture and Rural Affairs',
  },
  { value: '商务部', label_zh: '商务部', label_en: 'Ministry of Commerce' },
  {
    value: '文化和旅游部',
    label_zh: '文化和旅游部',
    label_en: 'Ministry of Culture and Tourism',
  },
  {
    value: '国家卫生健康委员会',
    label_zh: '国家卫生健康委员会',
    label_en: 'National Health Commission',
  },
  {
    value: '退役军人事务部',
    label_zh: '退役军人事务部',
    label_en: 'Ministry of Veterans Affairs',
  },
  {
    value: '应急部',
    label_zh: '应急部',
    label_en: 'Ministry of Emergency Management',
  },
  {
    value: '中国人民银行',
    label_zh: '中国人民银行',
    label_en: 'People\'s Bank of China',
  },
] as const

/**
 * 管理端政策实体
 */
export interface AdminPolicy {
  id: string
  level: AdminPolicyLevel
  name: string
  summary?: string | null
  status: string
  data_source?: string | null
  issuer?: string | null
  ministry_unit?: string | null
  doc_number?: string | null
  publish_date?: string | null
  effective_date?: string | null
  source_url?: string | null
  region_id?: string | null
  park_id?: string | null
  uploaded_at?: string | null
  modified_at?: string | null
  created_at: string
  updated_at: string
  // 关联信息（可选）
  tags?: { id: string; name: string }[]
}

export interface AdminPolicyTag {
  id: string
  code?: string | null
  name: string
  status: string
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * 语言类型
 */
export type Language = 'zh' | 'en'

/**
 * 多语言内容获取工具函数
 */
export function getLocalizedContent<T extends MultiLanguageField>(
  item: T, 
  language: Language
): string {
  if (language === 'zh') {
    return item.name_zh
  } else {
    return item.name_en || item.name_zh
  }
}

/**
 * 排序工具函数
 */
export function sortByOrder<T extends { sort_order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sort_order - b.sort_order)
}
