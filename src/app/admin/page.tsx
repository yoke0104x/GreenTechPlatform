'use client'

import { useState, useEffect } from 'react'
import { StatsCard } from '@/components/admin/dashboard/stats-card'
import { 
  Users, 
  Building2, 
  Lightbulb, 
  Settings,
  Calendar,
  BarChart3,
  MessageSquare,
  CheckCircle
} from 'lucide-react'

interface DashboardStats {
  totalTechnologies: number        // 技术总数
  totalCompanies: number          // 注册企业总数
  pendingContacts: number         // 待处理联系消息
  pendingTechReviews: number      // 待处理技术发布审核
  monthlyNewTechnologies: number  // 本月新增技术数
  monthlyNewCompanies: number     // 本月新增企业数
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTechnologies: 0,
    totalCompanies: 0,
    pendingContacts: 0,
    pendingTechReviews: 0,
    monthlyNewTechnologies: 0,
    monthlyNewCompanies: 0
  })

  const [isLoading, setIsLoading] = useState(true)

  // 加载统计数据
  const loadStats = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/dashboard-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error('加载统计数据失败:', response.statusText)
      }
    } catch (error) {
      console.error('加载统计数据错误:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">管理员控制台</h1>
        <p className="text-gray-600 mt-2">绿色技术平台数据管理中心</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="技术总数"
          value={stats.totalTechnologies}
          icon={Lightbulb}
          isLoading={isLoading}
          monthlyNew={stats.monthlyNewTechnologies}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white"
        />
        <StatsCard
          title="注册企业总数"
          value={stats.totalCompanies}
          icon={Building2}
          isLoading={isLoading}
          monthlyNew={stats.monthlyNewCompanies}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
        />
        <StatsCard
          title="待处理联系消息"
          value={stats.pendingContacts}
          icon={MessageSquare}
          isLoading={isLoading}
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white"
        />
        <StatsCard
          title="待处理技术发布审核"
          value={stats.pendingTechReviews}
          icon={CheckCircle}
          isLoading={isLoading}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white"
        />
      </div>


      {/* 快速操作 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          快速操作
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/basic-data/categories"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">管理分类</h3>
              <p className="text-sm text-gray-500">产业分类和子分类</p>
            </div>
          </a>
          
          <a
            href="/admin/carousel"
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Calendar className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">轮播图管理</h3>
              <p className="text-sm text-gray-500">首页与园区轮播图设置</p>
            </div>
          </a>
          
          <a
            href="/admin/companies"
            className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Building2 className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">企业管理</h3>
              <p className="text-sm text-gray-500">企业信息维护</p>
            </div>
          </a>
          
          <a
            href="/admin/technologies"
            className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Lightbulb className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">技术管理</h3>
              <p className="text-sm text-gray-500">绿色技术信息</p>
            </div>
          </a>
        </div>
        
        {/* 第二行快速操作 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <a
            href="/admin/messages"
            className="flex items-center p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors"
          >
            <MessageSquare className="w-8 h-8 text-pink-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">消息管理</h3>
              <p className="text-sm text-gray-500">用户联系消息和回复</p>
            </div>
          </a>
          
          <a
            href="/admin/users"
            className="flex items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Users className="w-8 h-8 text-indigo-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">用户管理</h3>
              <p className="text-sm text-gray-500">平台用户信息管理</p>
            </div>
          </a>
        </div>
      </div>

      {/* 系统状态 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">系统状态</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">数据库连接</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              正常
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">文件存储</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              正常
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">认证服务</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              正常
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
