'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ChevronUp, ChevronDown, Search, Filter } from 'lucide-react'
import { TablePagination } from './table-pagination'

export interface Column<T> {
  key: keyof T | string
  title: string
  sortable?: boolean
  width?: string
  render?: (value: T[keyof T], record: T, index: number) => React.ReactNode
  sticky?: 'left' | 'right'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
  onSort?: (field: string, order: 'asc' | 'desc') => void
  onSearch?: (value: string) => void
  searchPlaceholder?: string
  // 搜索触发模式：debounce（默认）或 enter
  searchMode?: 'debounce' | 'enter'
  // 当使用 debounce 模式时的延迟毫秒数
  searchDelay?: number
  actions?: React.ReactNode
  rowKey?: keyof T | ((record: T) => string)
  className?: string
  hideSearch?: boolean
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  onSort,
  onSearch,
  searchPlaceholder = '搜索...',
  searchMode = 'debounce',
  searchDelay = 300,
  actions,
  rowKey = 'id',
  className = '',
  hideSearch = false
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [searchValue, setSearchValue] = useState('')

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record)
    }
    return record[rowKey] || index.toString()
  }

  const handleSort = (field: string) => {
    if (!onSort) return

    let newOrder: 'asc' | 'desc' = 'asc'
    if (sortField === field && sortOrder === 'asc') {
      newOrder = 'desc'
    }

    setSortField(field)
    setSortOrder(newOrder)
    onSort(field, newOrder)
  }

  // 输入时仅更新本地状态，由useEffect做300ms防抖触发
  const handleSearchInput = (value: string) => {
    setSearchValue(value)
  }

  // onSearch 引用保持稳定，避免父组件每次渲染更换函数触发本地effect
  const onSearchRef = useRef<typeof onSearch>(onSearch)
  useEffect(() => {
    onSearchRef.current = onSearch
  }, [onSearch])

  // 防抖触发外部搜索回调，减少请求频率（仅在 debounce 模式生效）
  // 跳过首次挂载，避免在父组件loading切换导致的卸载/重挂载时循环触发搜索
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!onSearchRef.current) return
    if (searchMode !== 'debounce') return
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    const t = setTimeout(() => {
      onSearchRef.current && onSearchRef.current(searchValue)
    }, searchDelay)
    return () => clearTimeout(t)
  }, [searchValue, searchMode, searchDelay])

  const getCellValue = (record: T, column: Column<T>): T[keyof T] => {
    if (typeof column.key === 'string' && column.key.includes('.')) {
      // 支持嵌套属性 'user.name'
      return column.key.split('.').reduce((obj, key) => obj?.[key], record) as T[keyof T]
    }
    return record[column.key as keyof T]
  }

  const renderCell = (column: Column<T>, record: T, index: number) => {
    const value = getCellValue(record, column)
    
    if (column.render) {
      return column.render(value, record, index)
    }
    
    return value
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        {/* 加载状态的表格骨架 */}
        <div className="p-4 border-b border-gray-200">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 flex space-x-4">
              {columns.map((_, j) => (
                <div key={j} className="h-4 bg-gray-100 rounded animate-pulse flex-1"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 表格头部工具栏 */}
      {(!hideSearch && onSearch) || actions ? (
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!hideSearch && onSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (searchMode === 'enter') {
                        onSearchRef.current && onSearchRef.current(searchValue)
                      }
                    }
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-64"
                />
              </div>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      ) : null}

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* 表头 */}
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => {
                const stickyClass =
                  column.sticky === 'left'
                    ? 'sticky left-0 z-20 bg-gray-50'
                    : column.sticky === 'right'
                      ? 'sticky right-0 z-20 bg-gray-50'
                      : ''
                return (
                  <th
                    key={index}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    } ${stickyClass}`}
                    style={{ width: column.width, minWidth: column.width }}
                    onClick={() => column.sortable && column.key && handleSort(column.key as string)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.title}</span>
                      {column.sortable && column.key && (
                        <div className="flex flex-col">
                          <ChevronUp 
                            className={`w-3 h-3 -mb-1 ${
                              sortField === column.key && sortOrder === 'asc' 
                                ? 'text-green-600' 
                                : 'text-gray-400'
                            }`} 
                          />
                          <ChevronDown 
                            className={`w-3 h-3 ${
                              sortField === column.key && sortOrder === 'desc' 
                                ? 'text-green-600' 
                                : 'text-gray-400'
                            }`} 
                          />
                        </div>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <Filter className="w-12 h-12 text-gray-300 mb-2" />
                    <p>暂无数据</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr key={getRowKey(record, index)} className="hover:bg-gray-50 transition-colors">
                  {columns.map((column, colIndex) => {
                    const stickyClass =
                      column.sticky === 'left'
                        ? 'sticky left-0 z-10 bg-white'
                        : column.sticky === 'right'
                          ? 'sticky right-0 z-10 bg-white'
                          : ''
                    return (
                      <td
                        key={colIndex}
                        className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${stickyClass}`}
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        {renderCell(column, record, index)}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {pagination && (
        <div className="border-t border-gray-200">
          <TablePagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={pagination.onChange}
          />
        </div>
      )}
    </div>
  )
}
