'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProductCategory } from '@/api/tech';

interface ProductCategoriesProps {
  categories: ProductCategory[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  locale?: string;
}

export function ProductCategories({ 
  categories, 
  selectedCategory, 
  onCategorySelect,
  locale 
}: ProductCategoriesProps) {
  // 英文副标题兜底映射，确保第二行始终为英文
  const englishTitleMap: Record<string, string> = {
    'energy-saving': 'ENERGY SAVING',
    'clean-energy': 'CLEAN ENERGY',
    'clean-production': 'CLEAN PRODUCTION',
    'new-energy-vehicle': 'NEW ENERGY VEHICLE',
    '节能': 'ENERGY SAVING',
    '节能环保技术': 'ENERGY SAVING',
    '清洁能源': 'CLEAN ENERGY',
    '清洁能源技术': 'CLEAN ENERGY',
    '清洁生产': 'CLEAN PRODUCTION',
    '清洁生产技术': 'CLEAN PRODUCTION',
    '新能源汽车': 'NEW ENERGY VEHICLE',
    '新能源汽车技术': 'NEW ENERGY VEHICLE'
  };

  const getEnglishSubtitle = (category: ProductCategory) => {
    // 优先使用接口返回的英文名称，且与中文不同
    if (category.nameEn && category.nameEn.trim() && category.nameEn.trim() !== category.name?.trim()) {
      return category.nameEn;
    }
    // 其次用 id/slug 或中文名映射
    const keyCandidates = [
      category.id,
      (category as any).slug,
      category.name
    ].filter(Boolean) as string[];
    for (const key of keyCandidates) {
      if (englishTitleMap[key]) return englishTitleMap[key];
    }
    // 最后兜底：直接返回已有英文或中文
    const candidate = category.nameEn || category.name || '';
    // 如果仍然是中文，则回退到映射或通用英文标题，避免出现中文副标题
    if (/[\u4e00-\u9fa5]/.test(candidate)) {
      return englishTitleMap[category.id] || englishTitleMap[category.name || ''] || englishTitleMap[(category as any).slug] || 'ENERGY SAVING';
    }
    return candidate;
  };

  const [loadedImages, setLoadedImages] = useState<{[key: number]: string}>({});
  const t = useTranslations('home');

  // 尝试加载不同格式的图片
  const tryLoadImage = async (index: number) => {
    const formats = ['png', 'jpg', 'jpeg', 'webp'];
    
    for (const format of formats) {
      // 直接尝试加载图片，避免fetch被中间件拦截
      const url = `/images/categories/category-${index + 1}.${format}`;
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        setLoadedImages(prev => ({ ...prev, [index]: url }));
        return;
      } catch {
        // 继续尝试下一个格式
      }
    }
  };

  // 组件加载时尝试加载所有图片
  useEffect(() => {
    const loadImages = async () => {
      for (let i = 0; i < Math.min(categories.length, 4); i++) {
        await tryLoadImage(i);
      }
    };
    
    if (categories.length > 0) {
      loadImages();
    }
  }, [categories]);

  return (
    <section className="py-12" style={{backgroundColor: '#edeef7'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center mb-12">
          {/* 左侧橄榄枝装饰 */}
          <div className="hidden md:flex flex-1 items-center justify-end mr-6 lg:mr-8">
            <svg className="w-20 lg:w-32 h-8 lg:h-12 text-green-500" fill="none" viewBox="0 0 160 48">
              {/* 橄榄枝主茎 */}
              <path d="M20 24 Q50 20, 80 24 Q110 28, 140 24" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8"/>
              {/* 左侧叶片组 */}
              <ellipse cx="35" cy="18" rx="8" ry="4" fill="currentColor" opacity="0.6" transform="rotate(-30 35 18)"/>
              <ellipse cx="42" cy="30" rx="7" ry="3.5" fill="currentColor" opacity="0.5" transform="rotate(25 42 30)"/>
              {/* 中央叶片组 */}
              <ellipse cx="65" cy="16" rx="9" ry="4.5" fill="currentColor" opacity="0.7" transform="rotate(-20 65 16)"/>
              <ellipse cx="75" cy="32" rx="8" ry="4" fill="currentColor" opacity="0.6" transform="rotate(30 75 32)"/>
              {/* 右侧叶片组 */}
              <ellipse cx="105" cy="18" rx="7" ry="3.5" fill="currentColor" opacity="0.5" transform="rotate(-35 105 18)"/>
              <ellipse cx="115" cy="30" rx="8" ry="4" fill="currentColor" opacity="0.6" transform="rotate(20 115 30)"/>
              {/* 末端小叶片 */}
              <ellipse cx="130" cy="22" rx="6" ry="3" fill="currentColor" opacity="0.7" transform="rotate(-15 130 22)"/>
              <ellipse cx="135" cy="26" rx="5" ry="2.5" fill="currentColor" opacity="0.5" transform="rotate(15 135 26)"/>
            </svg>
          </div>
          
          {/* 标题文字 */}
          <h2 className="text-2xl md:text-3xl font-bold text-green-600 text-center">
            {t('categories')}
          </h2>
          
          {/* 右侧橄榄枝装饰 */}
          <div className="hidden md:flex flex-1 items-center justify-start ml-6 lg:ml-8">
            <svg className="w-20 lg:w-32 h-8 lg:h-12 text-green-500" fill="none" viewBox="0 0 160 48" style={{transform: 'scaleX(-1)'}}>
              {/* 橄榄枝主茎 */}
              <path d="M20 24 Q50 20, 80 24 Q110 28, 140 24" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8"/>
              {/* 左侧叶片组 */}
              <ellipse cx="35" cy="18" rx="8" ry="4" fill="currentColor" opacity="0.6" transform="rotate(-30 35 18)"/>
              <ellipse cx="42" cy="30" rx="7" ry="3.5" fill="currentColor" opacity="0.5" transform="rotate(25 42 30)"/>
              {/* 中央叶片组 */}
              <ellipse cx="65" cy="16" rx="9" ry="4.5" fill="currentColor" opacity="0.7" transform="rotate(-20 65 16)"/>
              <ellipse cx="75" cy="32" rx="8" ry="4" fill="currentColor" opacity="0.6" transform="rotate(30 75 32)"/>
              {/* 右侧叶片组 */}
              <ellipse cx="105" cy="18" rx="7" ry="3.5" fill="currentColor" opacity="0.5" transform="rotate(-35 105 18)"/>
              <ellipse cx="115" cy="30" rx="8" ry="4" fill="currentColor" opacity="0.6" transform="rotate(20 115 30)"/>
              {/* 末端小叶片 */}
              <ellipse cx="130" cy="22" rx="6" ry="3" fill="currentColor" opacity="0.7" transform="rotate(-15 130 22)"/>
              <ellipse cx="135" cy="26" rx="5" ry="2.5" fill="currentColor" opacity="0.5" transform="rotate(15 135 26)"/>
            </svg>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
          {categories.map((category, index) => {
            // 定义每个卡片的背景样式
            const getCardStyle = (index: number) => {
              const styles = [
                'bg-gradient-to-br from-teal-500 to-teal-700', // 第一个 - 青绿色
                'bg-gradient-to-br from-slate-700 to-slate-900', // 第二个 - 深灰色
                'bg-gradient-to-br from-emerald-600 to-emerald-800', // 第三个 - 祖母绿
                'bg-gradient-to-br from-green-700 to-green-900', // 第四个 - 深绿色
              ];
              return styles[index % 4];
            };

            return (
              <div
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`relative cursor-pointer overflow-hidden transition-all duration-300 hover:opacity-90 ${getCardStyle(index)}`}
                style={{
                  height: '300px',
                  backgroundImage: loadedImages[index] 
                    ? `url('${loadedImages[index]}')`
                   : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {/* 背景装饰图案 */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 right-4 w-16 h-16 border border-white/20 rounded-full"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border border-white/15 rounded-full"></div>
                  <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white/10 rounded-full"></div>
                </div>

                                 {/* 选中状态边框 */}
                 {selectedCategory === category.id && (
                   <div className="absolute inset-0 border-3 border-yellow-400"></div>
                 )}

                   {/* 内容区域 */}
               <div className="relative p-6 h-full flex flex-col justify-center text-white text-center">
                   {/* 顶部标题区域 - 固定高度以对齐下方统计 */}
                   <div className="mt-4 mb-2 flex-none h-24 md:h-28 flex flex-col justify-center overflow-hidden">
                      <h3 className="text-xl lg:text-2xl font-bold mb-1 text-center leading-tight">
                        {/* 始终用中文作为主标题，保持中英文页面一致 */}
                        {category.name || category.nameEn}
                      </h3>
                      <p className="text-sm text-white/80 uppercase tracking-wider font-medium text-center">
                       {/* 次行固定使用英文名称（接口英文或本地映射兜底），中英文页面均保持英文副标题 */}
                       {getEnglishSubtitle(category)}
                      </p>
                   </div>

                   {/* 数字统计区域 - 贴近卡片底部，跨卡水平对齐 */}
                   <div className="mt-2 flex flex-col items-center justify-center pb-2">
                     <div className="flex items-baseline gap-2 justify-center">
                       <span className="tabular-nums text-4xl lg:text-5xl font-bold">{category.count}</span>
                       <span className="text-2xl font-normal">+</span>
                     </div>
                     <div className="text-sm text-white/80 font-medium mt-1">
                       {t('relatedTechnology')}
                     </div>
                   </div>

                   
                 </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
} 
