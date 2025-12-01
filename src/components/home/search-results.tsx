'use client';

import { useState, useEffect, useRef } from 'react';
import { TechProduct, SortType } from '@/api/tech';
import { Clock, ArrowDownAZ, ArrowUpAZ, ChevronDown, ChevronDown as ChevronDownIcon, FileText, Download, Mail, Heart } from 'lucide-react';
import { ContactUsModal } from '@/components/contact/contact-us-modal';
import { useAuthContext } from '@/components/auth/auth-provider';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { addFavorite, getFavorites, removeFavorite } from '@/api/favorites';

interface SearchResultsProps {
  products: TechProduct[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalResults: number;
  currentCategory: string;
  // 新增接口参数
  companyCount?: number;
  technologyCount?: number;
  onSortChange?: (sortType: SortType) => void;
  locale?: string;
  // 分页器新增参数
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  // 搜索关键词，用于高亮标题与描述中的匹配片段
  highlightKeyword?: string;
  // UI控制参数
  showSummary?: boolean;
  showSort?: boolean;
  showPagination?: boolean;
  // 收藏状态回调
  onFavoriteRemoved?: (technologyId: string) => void;
  onFavoriteAdded?: (product: TechProduct) => void;
}

export function SearchResults({ 
  products, 
  currentPage, 
  totalPages, 
  onPageChange,
  totalResults,
  currentCategory: _currentCategory,
  companyCount, // 可选参数，如果未提供则基于搜索结果计算
  technologyCount, // 可选参数，如果未提供则使用totalResults
  onSortChange,
  locale,
  pageSize = 20,
  onPageSizeChange,
  highlightKeyword,
  showSummary,
  showSort,
  showPagination,
  onFavoriteRemoved,
  onFavoriteAdded
}: SearchResultsProps) {
  const { user } = useAuthContext();
  const userId = user?.id;
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [currentSort, setCurrentSort] = useState<SortType>('updateTime');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);

  const shouldShowSummary = showSummary ?? true;
  const shouldShowSort = showSort ?? true;
  const shouldShowPagination = showPagination ?? true;

  // 计算实际的企业数量（基于搜索结果去重）
  const actualCompanyCount = companyCount ?? new Set(products.map(product => product.companyName)).size;
  
  // 计算实际的技术数量
  const actualTechnologyCount = technologyCount ?? totalResults;
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedTechnology, setSelectedTechnology] = useState<{
    id: string;
    name: string;
    companyName: string;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部区域关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setFavoriteIds(new Set());
      setIsLoadingFavorites(false);
      return () => {
        active = false;
      };
    }

    setIsLoadingFavorites(true);
    getFavorites(userId)
      .then((items) => {
        if (!active) return;
        setFavoriteIds(new Set(items.map((item) => item.technologyId)));
      })
      .catch((error) => {
        console.error('加载收藏列表失败:', error);
      })
      .finally(() => {
        if (active) {
          setIsLoadingFavorites(false);
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const toggleDescription = (productId: string) => {
    const newExpanded = new Set(expandedDescriptions);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedDescriptions(newExpanded);
  };

  const handleToggleFavorite = async (productId: string) => {
    const isEnglish = locale === 'en';

    if (!userId) {
      alert(isEnglish ? 'You must register and login to save favorites' : '必须注册登录才能收藏技术');
      return;
    }

    setPendingFavoriteId(productId);

    const alreadyFavorited = favoriteIds.has(productId);

    try {
      if (alreadyFavorited) {
        const success = await removeFavorite(productId);
        if (success) {
          setFavoriteIds((prev) => {
            const updated = new Set(prev);
            updated.delete(productId);
            return updated;
          });
          onFavoriteRemoved?.(productId);
        } else {
          alert(isEnglish ? 'Failed to remove favorite, please try again later' : '取消收藏失败，请稍后重试');
        }
      } else {
        const favorite = await addFavorite(productId);
        if (favorite) {
          setFavoriteIds((prev) => {
            const updated = new Set(prev);
            updated.add(productId);
            return updated;
          });
          const product = products.find((item) => item.id === productId);
          if (product) {
            onFavoriteAdded?.(product);
          }
        } else {
          alert(isEnglish ? 'Failed to add favorite, please try again later' : '收藏失败，请稍后重试');
        }
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      alert(isEnglish ? 'Failed to update favorite, please try again later' : '收藏操作失败，请稍后重试');
    } finally {
      setPendingFavoriteId(null);
    }
  };

  const handleSortChange = (sortType: SortType) => {
    setCurrentSort(sortType);
    setIsDropdownOpen(false);
    onSortChange?.(sortType);
  };

  const sortOptions = [
    {
      value: 'updateTime' as SortType,
      label: locale === 'en' ? 'Update Time' : '更新时间',
      icon: Clock,
      className: 'text-gray-600'
    },
    {
      value: 'nameDesc' as SortType,
      label: locale === 'en' ? 'Name Descending' : '中文名称降序',
      icon: ArrowDownAZ,
      className: 'text-red-600'
    },
    {
      value: 'nameAsc' as SortType,
      label: locale === 'en' ? 'Name Ascending' : '中文名称升序',
      icon: ArrowUpAZ,
      className: 'text-green-600'
    }
  ];

  const currentSortOption = sortOptions.find(option => option.value === currentSort);
  const CurrentIcon = currentSortOption?.icon || Clock;

  // 将搜索关键词拆分成可匹配的子词，英文按空白/标点分词，中文保持原样
  const buildKeywords = (kw?: string) => {
    if (!kw) return [] as string[];
    const trimmed = kw.trim();
    if (!trimmed) return [] as string[];
    // 拆分：中文不分，英文按非字母数字分割
    const parts = trimmed
      .split(/\s+|[\,\.\;\:!\?\-\_\(\)\[\]\{\}\|\/+]+/)
      .filter(Boolean);
    // 若只有中文或未能拆分，返回原串
    return parts.length ? parts : [trimmed];
  };

  const highlightTokens = buildKeywords(highlightKeyword);

  // 高亮函数：将文本中匹配到的关键词片段用黄色背景标注
  const highlightText = (text: string): (string | JSX.Element)[] => {
    if (!highlightTokens.length || !text) return [text];
    try {
      const escaped = highlightTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
      const segments = String(text).split(regex);
      const nodes: (string | JSX.Element)[] = [];
      segments.forEach((seg, i) => {
        if (!seg) return;
        if (regex.test(seg)) {
          nodes.push(
            <mark key={`h-${i}`} className="bg-yellow-200 text-gray-900 rounded px-0.5">
              {seg}
            </mark>
          );
        } else {
          nodes.push(seg);
        }
      });
      return nodes;
    } catch {
      return [text];
    }
  };

  // 从URL中提取或生成有意义的文件名
  const getDisplayFilename = (url: string, originalName?: string) => {
    if (originalName) return originalName;
    
    // 从URL中提取文件名部分
    const urlPath = url.split('/').pop() || '';
    const parts = urlPath.split('.');
    
    if (parts.length > 1) {
      const ext = parts.pop(); // 获取文件扩展名
      // 如果文件名看起来像是时间戳+随机字符，则生成更友好的名称
      return locale === 'en' ? `Technical_Document.${ext}` : `技术资料.${ext}`;
    }
    
    return locale === 'en' ? 'Technical_Document' : '技术资料';
  };

  const handleDownloadAttachment = async (attachmentUrl: string, originalFilename?: string) => {
    try {
      // 获取有意义的文件名
      const filename = getDisplayFilename(attachmentUrl, originalFilename);
      
      // 使用API接口进行下载
      const downloadUrl = `/api/files/download?url=${encodeURIComponent(attachmentUrl)}&filename=${encodeURIComponent(filename)}`
      
      // 创建隐藏的下载链接
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error('下载附件失败:', error)
      alert(locale === 'en' ? 'Download failed, please try again' : '下载附件失败，请重试')
    }
  }

  // 处理联系我们按钮点击
  const handleContactUs = (product: TechProduct) => {
    if (!user) {
      alert(locale === 'en' ? 'You must register and login to contact technology providers' : '必须注册登录才能联系技术提供方');
      return;
    }

    setSelectedTechnology({
      id: product.id,
      name: locale === 'en' ? (product.solutionTitleEn || product.solutionTitle) : product.solutionTitle,
      companyName: locale === 'en' ? (product.companyNameEn || product.companyName) : product.companyName
    });
    setContactModalOpen(true);
  };

  // 关闭联系对话框
  const handleCloseContactModal = () => {
    setContactModalOpen(false);
    setSelectedTechnology(null);
  };

  return (
    <section className="pt-2 pb-8" style={{backgroundColor: '#edeef7'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 结果信息和排序 */}
        {(shouldShowSummary || shouldShowSort) && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            {shouldShowSummary && (
              <div className="text-sm text-gray-600">
                {locale === 'en' ? (
                  <>
                    Search Results: Found{' '}
                    <span className="font-black text-blue-600 mx-1">{actualTechnologyCount}</span>
                    green low-carbon technologies from{' '}
                    <span className="font-black text-blue-600 mx-1">{actualCompanyCount}</span>
                    companies
                  </>
                ) : (
                  <>
                    相关结果：为您搜索到来自
                    <span className="font-black text-blue-600 mx-1">{actualCompanyCount}</span>
                    家企业的
                    <span className="font-black text-blue-600 mx-1">{actualTechnologyCount}</span>
                    项绿色低碳技术
                  </>
                )}
              </div>
            )}
            {shouldShowSort && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{locale === 'en' ? 'Sort by:' : '排序方式:'}</span>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <CurrentIcon className={`w-4 h-4 ${currentSortOption?.className || 'text-gray-600'}`} />
                    <span>{currentSortOption?.label || (locale === 'en' ? 'Update Time' : '更新时间')}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                      {sortOptions.map((option) => {
                        const IconComponent = option.icon;
                        const isActive = currentSort === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleSortChange(option.value)}
                            className={`w-full flex items-center space-x-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                              isActive ? 'bg-green-50 text-green-700' : 'text-gray-700'
                            }`}
                          >
                            <IconComponent className={`w-4 h-4 ${option.className}`} />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 产品列表 */}
        <div className="space-y-6">
          {products.map((product) => {
            const isFavorited = favoriteIds.has(product.id);
            const isPendingFavorite = pendingFavoriteId === product.id;
            const favoriteDisabled = isLoadingFavorites || isPendingFavorite;
            const favoriteLabel = locale === 'en'
              ? (isFavorited ? 'Favorited' : 'Favorite')
              : (isFavorited ? '已收藏' : '收藏');
            const favoriteTitle = !userId
              ? (locale === 'en' ? 'You must register and login to save favorites' : '必须注册登录才能收藏技术')
              : (isFavorited ? (locale === 'en' ? 'Already in favorites' : '已收藏') : (locale === 'en' ? 'Add to favorites' : '加入收藏'));
            const favoriteButtonClasses = isFavorited
              ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';
            const favoriteButtonText = isPendingFavorite
              ? (locale === 'en' ? 'Saving...' : '处理中...')
              : favoriteLabel;

            return (
              <div key={product.id} className="border border-gray-200 rounded-lg overflow-hidden">
                             {/* 上方区域：公司信息 */}
               <div className="relative px-6 py-4 flex justify-between items-center bg-green-50">
                 {/* 左侧绿色小竖条 */}
                 <div className="absolute left-0 top-0 bottom-0 w-2 bg-green-500"></div>
                
                {/* 左侧：公司名称和标签 */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {locale === 'en' ? (product.companyNameEn || product.companyName) : product.companyName}
                  </h3>
                  {/* 四个标签：产业分类、子分类、国别（带国旗）、经开区 */}
                  <div className="flex flex-wrap gap-2">
                    {/* 产业分类标签 */}
                    {(product.categoryName || product.categoryNameEn) && (
                      <span className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-400 transition-colors cursor-pointer">
                        {locale === 'en' ? (product.categoryNameEn || product.categoryName) : product.categoryName}
                      </span>
                    )}
                    
                    {/* 子分类标签 */}
                    {(product.subCategoryName || product.subCategoryNameEn) && (
                      <span className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-400 transition-colors cursor-pointer">
                        {locale === 'en' ? (product.subCategoryNameEn || product.subCategoryName) : product.subCategoryName}
                      </span>
                    )}
                    
                    {/* 国别标签（带国旗） */}
                    {(product.countryName || product.countryNameEn) && (
                      <span className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-400 transition-colors cursor-pointer">
                        {product.countryFlagUrl && (
                          <img 
                            src={product.countryFlagUrl} 
                            alt={`${locale === 'en' ? (product.countryNameEn || product.countryName) : product.countryName} flag`}
                            className="w-4 h-3 mr-1 object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                        {locale === 'en' ? (product.countryNameEn || product.countryName) : product.countryName}
                      </span>
                    )}
                    
                    {/* 国家级经开区标签 */}
                    {(product.developmentZoneName || product.developmentZoneNameEn) && (
                      <span className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-400 transition-colors cursor-pointer">
                        {locale === 'en' ? (product.developmentZoneNameEn || product.developmentZoneName) : product.developmentZoneName}
                      </span>
                    )}
                    
                    {/* 应用场景标签 */}
                    {product.custom_label && (
                      <span className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-400 transition-colors cursor-pointer">
                        {product.custom_label}
                      </span>
                    )}
                  </div>
                </div>
                {/* 右侧：公司LOGO */}
                <div className="flex items-center">
                  {product.companyLogoUrl ? (
                    <img
                      src={product.companyLogoUrl}
                      alt={locale === 'en' ? (product.companyNameEn || product.companyName) : product.companyName}
                      className="h-12 w-auto object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // 如果logo加载失败，使用默认占位符
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        {locale === 'en' ? 
                          (product.companyNameEn || product.companyName)?.slice(0, 4) || 'Corp' : 
                          product.companyName?.slice(0, 4) || '企业'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 下方区域：技术信息 */}
              <div className="p-6 bg-white">
                <div className="flex flex-col lg:flex-row gap-6">
                                     {/* 左侧：技术简介缩略图 */}
                   <div className="lg:w-1/4">
                     <img
                       src={product.solutionThumbnail || product.solutionImage}
                       alt={locale === 'en' ? (product.solutionTitleEn || product.solutionTitle) : product.solutionTitle}
                       className="w-full h-64 object-contain rounded-lg bg-white"
                       onError={(e) => {
                         const target = e.target as HTMLImageElement;
                         target.src = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80';
                       }}
                     />
                   </div>

                                     {/* 右侧：技术名称和简介 */}
                   <div className="lg:w-3/4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        {(product.featuredWeight ?? 0) > 0 && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded">
                            <img src="/images/icons/premium.png" alt="featured" className="w-3.5 h-3.5 mr-1" />
                            {locale === 'en' ? 'Featured' : '精选'}
                          </span>
                        )}
                        <h4 className="text-xl font-bold text-gray-900">
                          {(() => {
                            const title = locale === 'en'
                              ? (product.solutionTitleEn || product.solutionTitle)
                              : product.solutionTitle;
                            return highlightText(title || '');
                          })()}
                        </h4>
                      </div>
                      
                      {/* 简介文字 - 最多6行 */}
                      <div className="mb-4">
                        {(() => {
                          const text = (locale === 'en'
                            ? (product.fullDescriptionEn || product.solutionDescriptionEn || product.fullDescription || product.solutionDescription)
                            : (product.fullDescription || product.solutionDescription)) || '';
                          const lines = String(text).split(/\r?\n/);
                          const makeFragments = () => {
                            const fragments: (string | JSX.Element)[] = [];
                            const labelRe = /^(\s*(?:Description|Benefit\s+Types|Benefit\s+Details|Deployed\s+In|Technology\s+Readiness\s+Level|ID)\s*:|(?:技术描述|收益类型|收益描述|应用地区和国家|技术成熟度|ID)\s*：)/;
                            lines.forEach((line, idx) => {
                              const m = line.match(labelRe);
                              if (m) {
                                const label = m[1];
                                const rest = line.slice(label.length);
                                fragments.push(<strong key={`l-${idx}`}>{label.trim()}</strong>);
                                fragments.push(...highlightText(rest));
                              } else {
                                fragments.push(...highlightText(line));
                              }
                              if (idx !== lines.length - 1) fragments.push('\n');
                            });
                            return fragments;
                          };
                          const styleCollapsed = {
                            display: '-webkit-box',
                            WebkitLineClamp: 6,
                            WebkitBoxOrient: 'vertical' as const,
                            overflow: 'hidden',
                            lineHeight: '1.5',
                            fontSize: '1rem',
                            whiteSpace: 'pre-line' as const
                          };
                          const styleExpanded = { lineHeight: '1.5', whiteSpace: 'pre-line' as const };
                          return (
                            <p className="text-gray-700" style={expandedDescriptions.has(product.id) ? styleExpanded : styleCollapsed}>
                              {makeFragments()}
                            </p>
                          );
                        })()}
                      
                        {/* 展开更多按钮 */}
                        {(product.fullDescription || product.solutionDescription.length > 3000) && (
                          <button
                            onClick={() => toggleDescription(product.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-flex items-center"
                          >
                            {expandedDescriptions.has(product.id) 
                              ? (locale === 'en' ? 'Show Less' : '收起') 
                              : (locale === 'en' ? 'Show More' : '展开更多')}
                            <ChevronDownIcon
                              className={`w-4 h-4 ml-1 transition-transform ${
                                expandedDescriptions.has(product.id) ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {/* 技术资料附件区域 - 只在展开状态下显示 */}
                      {expandedDescriptions.has(product.id) && product.attachmentUrls && product.attachmentUrls.length > 0 && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                          <div className="flex items-center mb-3">
                            <FileText className="w-5 h-5 text-gray-600 mr-2" />
                            <h5 className="text-sm font-medium text-gray-900">{locale === 'en' ? 'Technical Documents' : '技术资料附件'}</h5>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {product.attachmentUrls.map((attachment, index) => {
                              // 使用原始文件名如果可用，否则生成友好的文件名
                              const originalName = product.attachmentNames?.[index];
                              const filename = originalName || getDisplayFilename(attachment);
                              const shortName = filename.length > 25 ? filename.substring(0, 25) + '...' : filename;
                              return (
                                <button
                                  key={index}
                                  onClick={() => handleDownloadAttachment(attachment, filename)}
                                  className="flex items-center p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-gray-200 transition-colors group"
                                  title={filename}
                                >
                                  <Download className="w-4 h-4 mr-2 flex-shrink-0" />
                                  <span className="truncate">{shortName}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 右下角：收藏与联系我们按钮 */}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleToggleFavorite(product.id)}
                        disabled={favoriteDisabled}
                        className={`inline-flex h-10 items-center px-4 text-sm font-medium rounded-md border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${favoriteButtonClasses}`}
                        title={favoriteTitle}
                      >
                        <Heart
                          className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-current stroke-current' : ''}`}
                        />
                        {favoriteButtonText}
                      </button>
                      <button 
                        onClick={() => handleContactUs(product)}
                        className="inline-flex h-10 items-center px-4 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-70"
                        title={!user 
                          ? (locale === 'en' ? 'You must register and login to contact technology providers' : '必须注册登录才能联系技术提供方')
                          : (locale === 'en' ? 'Contact Us' : '联系我们')}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {locale === 'en' ? 'Contact Us' : '联系我们'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            );
          })}
        </div>

        {/* 简化分页器 */}
        {shouldShowPagination && totalPages > 0 && (
          <div className="mt-8">
            <SimplePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange || (() => {})}
              locale={locale}
            />
          </div>
        )}
      </div>

      {/* 联系我们对话框 */}
      <ContactUsModal
        isOpen={contactModalOpen}
        onClose={handleCloseContactModal}
        technologyId={selectedTechnology?.id}
        technologyName={selectedTechnology?.name}
        companyName={selectedTechnology?.companyName}
        locale={locale}
      />
    </section>
  );
}
