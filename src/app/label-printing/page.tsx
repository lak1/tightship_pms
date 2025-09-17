'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Printer, Download, Eye, Settings, Plus, Minus, Copy, Save, Trash2, Edit3 } from 'lucide-react'
import { STANDARD_ALLERGENS } from '@/lib/constants/allergens'
import { LABEL_DATABASE, LabelSize, getLabelsByCategory, getLabelCategories } from '@/lib/constants/labels'
import { useRestaurantMenu } from '@/contexts/RestaurantMenuContext'

interface LabelData {
  productId: string
  productName: string
  ingredients: string[]
  allergens: string[]
  copies: number
}

export default function LabelPrintingPage() {
  const { data: session } = useSession()
  const { selectedRestaurant, selectedMenu } = useRestaurantMenu()
  const [selectedLabels, setSelectedLabels] = useState<LabelData[]>([])
  const [labelPreset, setLabelPreset] = useState<string>('avery-5162')
  const [customSettings, setCustomSettings] = useState<LabelSize>(LABEL_DATABASE.custom)
  const [showSettings, setShowSettings] = useState(false)
  const [labelType, setLabelType] = useState<'ingredients' | 'allergens' | 'both'>('both')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveCategory, setSaveCategory] = useState('food')
  const [isShared, setIsShared] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const { data: products } = trpc.product.list.useQuery(
    {
      restaurantId: selectedRestaurant?.id || '',
      limit: 1000
    },
    { enabled: !!selectedRestaurant?.id }
  )

  const { data: customLabels } = trpc.labels.listCustom.useQuery(undefined, {
    enabled: !!session
  })

  const createCustomLabel = trpc.labels.create.useMutation({
    onSuccess: () => {
      setSaveDialogOpen(false)
      setSaveName('')
      setSaveDescription('')
      // Refetch custom labels
      trpc.labels.listCustom.useQuery.invalidate()
    }
  })

  const deleteCustomLabel = trpc.labels.delete.useMutation({
    onSuccess: () => {
      // If current selection was deleted, switch to default
      if (labelPreset.startsWith('custom_')) {
        setLabelPreset('avery-5162')
      }
      trpc.labels.listCustom.useQuery.invalidate()
    }
  })

  // Get current settings from either preset database or custom labels
  const getCurrentSettings = (): LabelSize => {
    if (labelPreset === 'custom') {
      return customSettings
    } else if (labelPreset.startsWith('custom_')) {
      const customLabel = customLabels?.find(l => `custom_${l.id}` === labelPreset)
      if (customLabel) {
        return {
          id: customLabel.id,
          name: customLabel.name,
          width: customLabel.width,
          height: customLabel.height,
          columns: customLabel.columns,
          rows: customLabel.rows,
          topMargin: customLabel.topMargin,
          leftMargin: customLabel.leftMargin,
          rightMargin: customLabel.rightMargin,
          bottomMargin: customLabel.bottomMargin,
          horizontalSpacing: customLabel.horizontalSpacing,
          verticalSpacing: customLabel.verticalSpacing,
          pageWidth: customLabel.pageWidth,
          pageHeight: customLabel.pageHeight,
          description: customLabel.description,
          category: customLabel.category as any
        }
      }
    } else if (LABEL_DATABASE[labelPreset]) {
      return LABEL_DATABASE[labelPreset]
    }
    return LABEL_DATABASE['avery-5162'] // fallback
  }

  const currentSettings = getCurrentSettings()


  const addProductToLabels = (product: any) => {
    const existing = selectedLabels.find(l => l.productId === product.id)
    if (existing) {
      setSelectedLabels(labels =>
        labels.map(l =>
          l.productId === product.id
            ? { ...l, copies: l.copies + 1 }
            : l
        )
      )
    } else {
      const newLabel: LabelData = {
        productId: product.id,
        productName: product.name,
        ingredients: product.ingredients || [],
        allergens: product.allergens || [],
        copies: 1
      }
      setSelectedLabels(labels => [...labels, newLabel])
    }
  }

  const updateLabelCopies = (productId: string, copies: number) => {
    if (copies <= 0) {
      setSelectedLabels(labels => labels.filter(l => l.productId !== productId))
    } else {
      setSelectedLabels(labels =>
        labels.map(l =>
          l.productId === productId
            ? { ...l, copies }
            : l
        )
      )
    }
  }

  const handleSaveCustomLabel = async () => {
    if (!saveName.trim()) return

    await createCustomLabel.mutateAsync({
      name: saveName,
      description: saveDescription || undefined,
      width: customSettings.width,
      height: customSettings.height,
      columns: customSettings.columns,
      rows: customSettings.rows,
      topMargin: customSettings.topMargin,
      leftMargin: customSettings.leftMargin,
      rightMargin: customSettings.rightMargin,
      bottomMargin: customSettings.bottomMargin,
      horizontalSpacing: customSettings.horizontalSpacing,
      verticalSpacing: customSettings.verticalSpacing,
      pageWidth: customSettings.pageWidth,
      pageHeight: customSettings.pageHeight,
      category: saveCategory,
      isShared: isShared
    })
  }

  const generateLabelContent = (label: LabelData) => {
    const parts = []

    if (labelType === 'ingredients' || labelType === 'both') {
      if (label.ingredients.length > 0) {
        parts.push(`Ingredients: ${label.ingredients.join(', ')}`)
      }
    }

    if (labelType === 'allergens' || labelType === 'both') {
      if (label.allergens.length > 0) {
        const relevantAllergens = label.allergens.filter(allergen =>
          STANDARD_ALLERGENS.includes(allergen)
        )
        if (relevantAllergens.length > 0) {
          parts.push(`Allergens: ${relevantAllergens.join(', ')}`)
        }
      }
    }

    return parts.join('. ')
  }

  const generatePreviewLabels = () => {
    const labels = []
    for (const labelData of selectedLabels) {
      for (let i = 0; i < labelData.copies; i++) {
        labels.push(labelData)
      }
    }
    return labels
  }

  const generatePDF = async () => {
    const jsPDF = (await import('jspdf')).default
    const labels = generatePreviewLabels()

    // Create new PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    labels.forEach((label, index) => {
      const row = Math.floor(index / currentSettings.columns)
      const col = index % currentSettings.columns

      // Calculate position
      const left = currentSettings.leftMargin + (col * (currentSettings.width + currentSettings.horizontalSpacing))
      const top = currentSettings.topMargin + (row * (currentSettings.height + currentSettings.verticalSpacing))

      // Add new page if needed
      if (row >= currentSettings.rows && index > 0 && row % currentSettings.rows === 0) {
        pdf.addPage()
      }

      const pageRow = row % currentSettings.rows
      const pageTop = currentSettings.topMargin + (pageRow * (currentSettings.height + currentSettings.verticalSpacing))

      // Draw label border (optional, for alignment)
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.1)
      pdf.rect(left, pageTop, currentSettings.width, currentSettings.height)

      // Product name
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.text(label.productName, left + 1, pageTop + 4, { maxWidth: currentSettings.width - 2 })

      // Content
      const content = generateLabelContent(label)
      if (content) {
        pdf.setFontSize(6)
        pdf.setFont('helvetica', 'normal')
        const splitContent = pdf.splitTextToSize(content, currentSettings.width - 2)
        pdf.text(splitContent, left + 1, pageTop + 7, { maxWidth: currentSettings.width - 2 })
      }
    })

    // Download PDF
    pdf.save(`labels-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const generatePreview = () => {
    const labels = generatePreviewLabels()
    const previewLabels = labels.slice(0, currentSettings.columns * currentSettings.rows) // Show one page

    return (
      <div className="bg-white border-2 border-gray-300 mx-auto" style={{
        width: `${currentSettings.pageWidth * 0.8}mm`,
        height: `${currentSettings.pageHeight * 0.8}mm`,
        transform: 'scale(0.8)',
        transformOrigin: 'top center',
        position: 'relative'
      }}>
        {previewLabels.map((label, index) => {
          const row = Math.floor(index / currentSettings.columns)
          const col = index % currentSettings.columns

          const left = (currentSettings.leftMargin + (col * (currentSettings.width + currentSettings.horizontalSpacing))) * 0.8
          const top = (currentSettings.topMargin + (row * (currentSettings.height + currentSettings.verticalSpacing))) * 0.8

          return (
            <div
              key={index}
              className="absolute border border-gray-300 bg-white p-1 overflow-hidden"
              style={{
                left: `${left}mm`,
                top: `${top}mm`,
                width: `${currentSettings.width * 0.8}mm`,
                height: `${currentSettings.height * 0.8}mm`,
                fontSize: '6px',
                lineHeight: '1.1'
              }}
            >
              <div className="font-bold text-xs mb-1">{label.productName}</div>
              <div className="text-xs leading-tight">{generateLabelContent(label)}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Please sign in to access this page.</div>
      </div>
    )
  }

  return (
    <DashboardLayout
      title="Label Printing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Label Printing' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">

        {/* Configuration Panel */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Label Configuration</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Label Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label Content
              </label>
              <select
                value={labelType}
                onChange={(e) => setLabelType(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="both">Ingredients & Allergens</option>
                <option value="ingredients">Ingredients Only</option>
                <option value="allergens">Allergens Only</option>
              </select>
            </div>

            {/* Label Size Preset */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label Size
              </label>
              <select
                value={labelPreset}
                onChange={(e) => setLabelPreset(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {/* Food Industry Labels */}
                <optgroup label="🍽️ Food Industry">
                  {getLabelsByCategory('food').map(label => (
                    <option key={label.id} value={label.id}>
                      {label.name} ({label.width}×{label.height}mm)
                    </option>
                  ))}
                </optgroup>

                {/* Popular Address Labels */}
                <optgroup label="📬 Address Labels">
                  {getLabelsByCategory('address').slice(0, 5).map(label => (
                    <option key={label.id} value={label.id}>
                      {label.name} ({label.width}×{label.height}mm)
                    </option>
                  ))}
                </optgroup>

                {/* Shipping Labels */}
                <optgroup label="📦 Shipping Labels">
                  {getLabelsByCategory('shipping').map(label => (
                    <option key={label.id} value={label.id}>
                      {label.name} ({label.width}×{label.height}mm)
                    </option>
                  ))}
                </optgroup>

                {/* Product Labels */}
                <optgroup label="🏷️ Product Labels">
                  {getLabelsByCategory('product').map(label => (
                    <option key={label.id} value={label.id}>
                      {label.name} ({label.width}×{label.height}mm)
                    </option>
                  ))}
                </optgroup>

                {/* Custom Saved Labels */}
                {customLabels && customLabels.length > 0 && (
                  <optgroup label="💾 Your Saved Labels">
                    {customLabels.map(label => (
                      <option key={`custom_${label.id}`} value={`custom_${label.id}`}>
                        {label.name} ({label.width}×{label.height}mm)
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Custom Editor */}
                <optgroup label="⚙️ Custom">
                  <option value="custom">Custom Size (Edit Below)</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Custom Settings */}
          {labelPreset === 'custom' && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-md font-medium text-gray-900 mb-4">Custom Label Settings</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Width (mm)</label>
                  <input
                    type="number"
                    value={customSettings.width}
                    onChange={(e) => setCustomSettings(s => ({ ...s, width: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (mm)</label>
                  <input
                    type="number"
                    value={customSettings.height}
                    onChange={(e) => setCustomSettings(s => ({ ...s, height: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Columns</label>
                  <input
                    type="number"
                    value={customSettings.columns}
                    onChange={(e) => setCustomSettings(s => ({ ...s, columns: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
                  <input
                    type="number"
                    value={customSettings.rows}
                    onChange={(e) => setCustomSettings(s => ({ ...s, rows: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Top Margin (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customSettings.topMargin}
                    onChange={(e) => setCustomSettings(s => ({ ...s, topMargin: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Left Margin (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customSettings.leftMargin}
                    onChange={(e) => setCustomSettings(s => ({ ...s, leftMargin: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">H-Spacing (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customSettings.horizontalSpacing}
                    onChange={(e) => setCustomSettings(s => ({ ...s, horizontalSpacing: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">V-Spacing (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customSettings.verticalSpacing}
                    onChange={(e) => setCustomSettings(s => ({ ...s, verticalSpacing: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Save Custom Label */}
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setSaveDialogOpen(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save As Custom Label
                </button>
              </div>
            </div>
          )}

          {/* Custom Label Management */}
          {customLabels && customLabels.length > 0 && labelPreset.startsWith('custom_') && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-md font-medium text-gray-900 mb-4">Manage This Label</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const customLabel = customLabels.find(l => `custom_${l.id}` === labelPreset)
                    if (customLabel) {
                      setCustomSettings({
                        ...customLabel,
                        id: customLabel.id,
                        name: customLabel.name,
                        category: customLabel.category as any
                      })
                      setLabelPreset('custom')
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    const customLabel = customLabels.find(l => `custom_${l.id}` === labelPreset)
                    if (customLabel && confirm(`Delete "${customLabel.name}"?`)) {
                      deleteCustomLabel.mutate({ id: customLabel.id })
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          {products && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Products</h3>
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {products.products.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => addProductToLabels(product)}
                    >
                      <div>
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-gray-500">
                          {product.ingredients?.length || 0} ingredients, {product.allergens?.length || 0} allergens
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected Labels */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Selected Labels ({generatePreviewLabels().length} total)
              </h3>
              {selectedLabels.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={generatePDF}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => {
                      // Generate and immediately print
                      generatePDF()
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedLabels.map(label => (
                <div key={label.productId} className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{label.productName}</div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateLabelCopies(label.productId, label.copies - 1)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-medium min-w-[2rem] text-center">{label.copies}</span>
                      <button
                        onClick={() => updateLabelCopies(label.productId, label.copies + 1)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 leading-relaxed">
                    {generateLabelContent(label) || 'No content available for selected label type'}
                  </div>
                </div>
              ))}

              {selectedLabels.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Printer className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>Select products to create labels</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Preview</h3>
              <div className="text-sm text-gray-500">
                {currentSettings.name}
              </div>
            </div>

            <div className="overflow-auto" style={{ maxHeight: '600px' }}>
              {selectedLabels.length > 0 ? (
                generatePreview()
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Eye className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>Select products to preview labels</p>
                </div>
              )}
            </div>

            {selectedLabels.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Labels per page: {currentSettings.columns * currentSettings.rows}</span>
                  <span>Total pages: {Math.ceil(generatePreviewLabels().length / (currentSettings.columns * currentSettings.rows))}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Custom Label Dialog */}
        {saveDialogOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Save Custom Label</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="e.g., My Allergen Labels"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="Description of when to use this label size..."
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={saveCategory}
                    onChange={(e) => setSaveCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="food">Food Industry</option>
                    <option value="address">Address Labels</option>
                    <option value="shipping">Shipping Labels</option>
                    <option value="product">Product Labels</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isShared}
                      onChange={(e) => setIsShared(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Share with team members</span>
                  </label>
                </div>

                <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                  <strong>Current Settings:</strong><br />
                  {customSettings.width}×{customSettings.height}mm,
                  {customSettings.columns}×{customSettings.rows} grid
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleSaveCustomLabel}
                  disabled={!saveName.trim() || createCustomLabel.isLoading}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createCustomLabel.isLoading ? 'Saving...' : 'Save Label'}
                </button>
                <button
                  onClick={() => setSaveDialogOpen(false)}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}