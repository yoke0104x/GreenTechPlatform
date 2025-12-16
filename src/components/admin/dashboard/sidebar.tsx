'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard,
  Settings,
  MapPin,
  Calendar,
  Building2,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Home,
  Users,
  MessageSquare,
  FileText,
  Tag,
  Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStats } from '@/hooks/use-admin-stats'

interface MenuItem {
  id: string
  label: string
  icon: React.ElementType
  href?: string
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: '控制台',
    icon: LayoutDashboard,
    href: '/admin'
  },
  {
    id: 'basic-data',
    label: '基础数据管理',
    icon: Settings,
    children: [
      {
        id: 'categories',
        label: '产业分类管理',
        icon: Settings,
        href: '/admin/basic-data/categories'
      },
      {
        id: 'countries',
        label: '国别管理',
        icon: MapPin,
        href: '/admin/basic-data/countries'
      },
      {
        id: 'domestic-zones',
        label: '国内省份/经开区管理',
        icon: Building2,
        href: '/admin/basic-data/domestic-zones'
      }
    ]
  },
  {
    id: 'carousel',
    label: '轮播图管理',
    icon: Calendar,
    href: '/admin/carousel'
  },
  {
    id: 'companies',
    label: '企业管理',
    icon: Building2,
    href: '/admin/companies'
  },
  {
    id: 'parks',
    label: '园区管理',
    icon: Building2,
    href: '/admin/parks'
  },
  {
    id: 'rankings',
    label: '榜单/品牌',
    icon: Trophy,
    href: '/admin/rankings'
  },
  {
    id: 'users',
    label: '用户管理',
    icon: Users,
    href: '/admin/users'
  },
  {
    id: 'messages',
    label: '消息管理',
    icon: MessageSquare,
    href: '/admin/messages'
  },
  {
    id: 'technologies',
    label: '技术管理',
    icon: Lightbulb,
    href: '/admin/technologies'
  },
  {
    id: 'policies',
    label: '政策管理',
    icon: FileText,
    href: '/admin/policies',
  },
  {
    id: 'policy-tags',
    label: '政策标签管理',
    icon: Tag,
    href: '/admin/policy-tags',
  },
  {
    id: 'wipo-scraper',
    label: 'WIPO数据爬虫',
    icon: Lightbulb,
    href: '/admin/wipo-scraper'
  }
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['basic-data'])
  const { stats } = useAdminStats()

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)
    const active = item.href ? isActive(item.href) : false
    
    // 获取对应的徽章数量
    const getBadgeCount = (itemId: string) => {
      switch (itemId) {
        case 'messages':
          return stats.pendingContacts
        case 'technologies':
          return stats.pendingTechnologies
        default:
          return 0
      }
    }
    
    const badgeCount = getBadgeCount(item.id)

    return (
      <div key={item.id}>
        {item.href ? (
          <Link
            href={item.href}
            className={cn(
              'flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              level > 0 && 'ml-4',
              active 
                ? 'bg-green-100 text-green-900 border-r-2 border-green-500' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <div className="flex items-center">
              <item.icon className={cn('w-5 h-5 mr-3', active ? 'text-green-600' : 'text-gray-400')} />
              {item.label}
            </div>
            {badgeCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </Link>
        ) : (
          <button
            onClick={() => hasChildren && toggleExpanded(item.id)}
            className={cn(
              'flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              level > 0 && 'ml-4',
              'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <div className="flex items-center">
              <item.icon className="w-5 h-5 mr-3 text-gray-400" />
              {item.label}
            </div>
            {hasChildren && (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )
            )}
          </button>
        )}
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed top-16 bottom-0 left-0 z-30 w-64 bg-white border-r border-gray-200">
      {/* Logo区域 */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <Link href="/" className="flex items-center">
          <Home className="w-8 h-8 text-green-600 mr-2" />
          <div>
            <div className="text-lg font-bold text-gray-900">绿色技术平台</div>
            <div className="text-xs text-gray-500">管理员控制台</div>
          </div>
        </Link>
      </div>

      {/* 导航菜单 */}
      <nav className="px-3 py-6 flex-1 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map(item => renderMenuItem(item))}
        </div>
      </nav>

      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          <p>版本 v1.0.0</p>
          <p className="mt-1">© 2025 绿色技术平台</p>
        </div>
      </div>
    </div>
  )
}
