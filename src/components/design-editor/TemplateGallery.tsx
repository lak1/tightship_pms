'use client'

import { useState, useMemo } from 'react'
import { Search, Grid3x3, List, X } from 'lucide-react'
import {
  getAllTemplates,
  getCategories,
  searchTemplates,
  getTemplatesByCategory,
  type TemplateWithData,
} from './templates/index'

interface TemplateGalleryProps {
  onSelectTemplate: (template: TemplateWithData) => void
  onClose?: () => void
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'category' | 'newest'

export default function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('category')

  const categories = getCategories()

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let templates: TemplateWithData[]

    // Filter by category
    if (selectedCategory === 'all') {
      templates = getAllTemplates()
    } else {
      templates = getTemplatesByCategory(selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      templates = templates.filter(
        template =>
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Sort templates
    switch (sortBy) {
      case 'name':
        templates.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'category':
        templates.sort((a, b) => a.category.localeCompare(b.category))
        break
      case 'newest':
        // Templates are already in order of creation
        break
    }

    return templates
  }, [searchQuery, selectedCategory, sortBy])

  const handleTemplateClick = (template: TemplateWithData) => {
    onSelectTemplate(template)
    if (onClose) onClose()
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Template Gallery</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredTemplates.length} professional menu templates
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mt-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates by name, category, or tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-300">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`border-l border-gray-300 p-2 ${
                viewMode === 'list'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="category">Sort by Category</option>
            <option value="name">Sort by Name</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Category Filter */}
      <div className="border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Templates ({getAllTemplates().length})
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid/List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTemplates.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Search className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => handleTemplateClick(template)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map(template => (
              <TemplateListItem
                key={template.id}
                template={template}
                onClick={() => handleTemplateClick(template)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Template Card Component (Grid View)
function TemplateCard({
  template,
  onClick,
}: {
  template: TemplateWithData
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg"
    >
      {/* Template Preview */}
      <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="h-full w-full rounded border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 text-center text-sm font-bold text-gray-800">MENU</div>
          <div className="space-y-3">
            <div className="h-2 w-16 bg-gray-300 rounded"></div>
            <div className="h-3 w-full bg-gray-200 rounded"></div>
            <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
            <div className="h-2 w-full bg-gray-100 rounded"></div>
            <div className="h-2 w-2/3 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>

      {/* Template Info */}
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600">
          {template.name}
        </h3>
        <p className="mt-1 text-sm text-gray-500 capitalize">{template.category.replace('-', ' ')}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {template.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Template List Item Component (List View)
function TemplateListItem({
  template,
  onClick,
}: {
  template: TemplateWithData
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
    >
      {/* Mini Preview */}
      <div className="h-20 w-16 flex-shrink-0 rounded border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-2">
        <div className="h-full w-full rounded bg-white"></div>
      </div>

      {/* Template Info */}
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{template.name}</h3>
        <p className="mt-1 text-sm text-gray-500">{template.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {template.tags.map(tag => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Category Badge */}
      <div className="flex-shrink-0">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          {template.category.replace('-', ' ')}
        </span>
      </div>
    </div>
  )
}
