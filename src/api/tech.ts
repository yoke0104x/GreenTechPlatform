import { apiClient, ApiResponse } from './index';

// 技术产品类型定义
export interface TechProduct {
  id: string;
  companyName: string;
  companyNameEn: string;
  companyLogo: string;
  solutionTitle: string;
  solutionTitleEn?: string; // 技术英文名称
  solutionImage: string;
  solutionDescription: string;
  solutionDescriptionEn?: string; // 技术英文描述
  category: string;
  subCategory: string;
  country: string;
  province: string;
  developmentZone: string;
  hasContact: boolean;
  updateTime: string; // 添加更新时间字段
  // 新增字段
  companyLogoUrl?: string; // 公司logo图片URL
  solutionThumbnail?: string; // 技术简介缩略图
  shortDescription?: string; // 简短描述（3行文字）
  shortDescriptionEn?: string; // 简短英文描述
  fullDescription?: string; // 完整描述
  fullDescriptionEn?: string; // 完整英文描述
  attachmentUrls?: string[]; // 附件文件URL数组
  attachmentNames?: string[]; // 附件原始文件名数组（与URL对应）
  // 新增标签字段
  categoryName?: string; // 产业分类名称
  categoryNameEn?: string; // 产业分类英文名称
  subCategoryName?: string; // 子分类名称
  subCategoryNameEn?: string; // 子分类英文名称
  countryName?: string; // 国别名称
  countryNameEn?: string; // 国别英文名称
  countryFlagUrl?: string; // 国旗logo URL
  developmentZoneName?: string; // 国家级经开区名称
  developmentZoneNameEn?: string; // 国家级经开区英文名称
  custom_label?: string; // 应用场景标签
  featuredWeight?: number; // 精选权重
}

// 子分类类型
export interface SubCategory {
  id: string;
  name: string;
  count: number;
  isVirtual?: boolean;
}

// 主分类类型
export interface MainCategory {
  id: string;
  name: string;
  count: number;
  subCategories: SubCategory[];
}

// 产品分类类型
export interface ProductCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  count: number;
  color: string;
}

// 搜索结果统计信息
export interface SearchStats {
  companyCount: number;
  technologyCount: number;
  totalResults: number;
}

// 排序类型定义
export type SortType = 'updateTime' | 'nameDesc' | 'nameAsc';

// 搜索参数类型
export interface SearchParams {
  keyword?: string;
  category?: string;
  subCategory?: string;
  country?: string;
  province?: string;
  developmentZone?: string;
  page?: number;
  pageSize?: number;
  sortBy?: SortType;
}

// 搜索结果类型
export interface SearchResult {
  products: TechProduct[];
  total: number;
  page: number;
  pageSize: number;
  categories: ProductCategory[];
  stats: SearchStats;
}

// 获取产品分类
export const getProductCategories = async (): Promise<ApiResponse<ProductCategory[]>> => {
  try {
    const { safeGet, handleApiResponse } = await import('@/lib/safe-fetch');
    
    const response = await safeGet('/api/tech/categories');
    const result = await handleApiResponse(response);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch categories');
    }

    return {
      success: true,
      data: result.data,
      error: undefined
    };

  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// 获取主分类和子分类
export const getMainCategories = async (): Promise<ApiResponse<MainCategory[]>> => {
  return apiClient.get<MainCategory[]>('/tech/main-categories');
};

// 搜索技术产品
export const searchTechProducts = async (params: SearchParams): Promise<ApiResponse<SearchResult>> => {
  try {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryString.append(key, String(value));
      }
    });
    
    const { safeGet, handleApiResponse } = await import('@/lib/safe-fetch');
    
    const response = await safeGet(`/api/tech/search?${queryString.toString()}`);
    const result = await handleApiResponse(response);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to search technologies');
    }

    return {
      success: true,
      data: result.data,
      error: undefined
    };

  } catch (error) {
    console.error('Error searching technologies:', error);
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// 获取搜索结果统计信息
export const getSearchStats = async (params: SearchParams): Promise<ApiResponse<SearchStats>> => {
  try {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryString.append(key, String(value));
      }
    });
    
    const { safeGet, handleApiResponse } = await import('@/lib/safe-fetch');
    
    const response = await safeGet(`/api/tech/search-stats?${queryString.toString()}`);
    const result = await handleApiResponse(response);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get search stats');
    }

    return {
      success: true,
      data: result.data,
      error: undefined
    };

  } catch (error) {
    console.error('Error getting search stats:', error);
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// 按ID获取单个技术详情（移动端复用）
export const getTechnologyById = async (id: string): Promise<ApiResponse<TechProduct>> => {
  try {
    const { safeGet, handleApiResponse } = await import('@/lib/safe-fetch');
    const resp = await safeGet(`/api/tech/detail?id=${encodeURIComponent(id)}`)
    const result = await handleApiResponse(resp)
    if (!result.success) throw new Error(result.error || 'Failed to fetch technology')
    return { success: true, data: result.data, error: undefined }
  } catch (error) {
    console.error('Error fetching technology detail:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// 获取筛选选项
interface FilterData {
  categories: unknown[]
  countries: unknown[]
  provinces: unknown[]
  developmentZones: unknown[]
}

export const getFilterOptions = async (): Promise<ApiResponse<FilterData>> => {
  try {
    const { safeGet, handleApiResponse } = await import('@/lib/safe-fetch');
    
    const response = await safeGet('/api/tech/filter-options');
    const result = await handleApiResponse(response);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get filter options');
    }

    return {
      success: true,
      data: result.data,
      error: undefined
    };

  } catch (error) {
    console.error('Error getting filter options:', error);
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 
