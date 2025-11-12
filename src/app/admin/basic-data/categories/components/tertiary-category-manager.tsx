'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Layers } from 'lucide-react'
import { AdminTertiaryCategory } from '@/lib/types/admin'
import { getTertiaryCategoriesApi, deleteTertiaryCategoryApi } from '@/lib/api/admin-tertiary-categories'
import { TertiaryCategoryForm } from './tertiary-category-form'
import { QuaternaryCategoryManager } from './quaternary-category-manager'

interface Props {
  subcategoryId: string
  subcategoryName?: string
  onClose: () => void
}

export function TertiaryCategoryManager({ subcategoryId, subcategoryName, onClose }: Props) {
  const [items, setItems] = useState<AdminTertiaryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AdminTertiaryCategory | null>(null)
  const [openQuaternaryFor, setOpenQuaternaryFor] = useState<AdminTertiaryCategory | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const data = await getTertiaryCategoriesApi(subcategoryId)
      setItems(data)
    } catch (e) {
      console.error('加载三级分类失败:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [subcategoryId])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Layers className="w-5 h-5 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold">管理三级分类{subcategoryName ? `（${subcategoryName}）` : ''}</h2>
          </div>
          <button onClick={onClose} className="px-3 py-1 border rounded-lg">关闭</button>
        </div>

        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-gray-600">共 {items.length} 项</div>
            <button onClick={() => { setEditing(null); setShowForm(true) }} className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg">
              <Plus className="w-4 h-4 mr-1" /> 新增三级分类
            </button>
          </div>

          {loading ? (
            <div className="text-gray-500">加载中...</div>
          ) : items.length === 0 ? (
            <div className="text-gray-500">暂无数据</div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div>
                    <div className="font-medium">{item.name_zh}</div>
                    <div className="text-xs text-gray-500">{item.name_en}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setOpenQuaternaryFor(item)} className="px-2 py-1 text-sm border rounded">管理四级分类</button>
                    <button onClick={() => { setEditing(item); setShowForm(true) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="编辑"><Edit className="w-4 h-4" /></button>
                    <button onClick={async () => {
                      if (!confirm(`确认删除三级分类“${item.name_zh}”？`)) return
                      try {
                        await deleteTertiaryCategoryApi(item.id)
                        await load()
                      } catch (e) {
                        const message = e instanceof Error ? e.message : '删除失败'
                        alert(message)
                      }
                    }} className="p-1 text-red-600 hover:bg-red-50 rounded" title="删除"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <TertiaryCategoryForm
          subcategoryId={subcategoryId}
          category={editing}
          onSuccess={() => { setShowForm(false); setEditing(null); load() }}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {openQuaternaryFor && (
        <QuaternaryCategoryManager
          tertiaryCategoryId={openQuaternaryFor.id}
          tertiaryName={openQuaternaryFor.name_zh}
          onClose={() => setOpenQuaternaryFor(null)}
        />
      )}
    </div>
  )
}
