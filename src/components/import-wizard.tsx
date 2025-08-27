'use client'

import { useState, useCallback } from 'react'
import { 
  parseFile, 
  suggestMappings, 
  applyMappings, 
  validateImportData, 
  generateImportSummary,
  getFieldOptions,
  calculateBasePrice,
  transforms,
  type ParsedData,
  type ColumnMapping,
  type ImportSummary as Summary
} from '@/lib/import-utils'
import { trpc } from '@/lib/trpc'

interface ImportWizardProps {
  restaurantId: string
  menuId: string
  onComplete?: () => void
  onCancel?: () => void
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'

export function ImportWizard({ 
  restaurantId, 
  menuId, 
  onComplete, 
  onCancel 
}: ImportWizardProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [summary, setSummary] = useState<Summary | null>(null)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [createCategories, setCreateCategories] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)

  const importMutation = trpc.product.importProducts.useMutation()
  const { data: taxRates = [] } = trpc.product.getTaxRates.useQuery({ restaurantId })
  
  // Convert Decimal rates to numbers for calculations
  const taxRatesWithNumbers = taxRates.map(tr => ({
    id: tr.id,
    name: tr.name,
    rate: Number(tr.rate)
  }))

  const processFile = useCallback(async (file: File) => {
    setFile(file)
    
    try {
      const data = await parseFile(file)
      setParsedData(data)
      
      // Auto-suggest mappings using tax rates
      const suggestions = suggestMappings(data.headers, taxRatesWithNumbers)
      console.log('Headers:', data.headers)
      console.log('Suggested mappings:', suggestions)
      console.log('First few rows of raw data:', data.rows.slice(0, 2))
      setMappings(suggestions)
      
      setStep('mapping')
    } catch (error) {
      alert('Error parsing file: ' + (error as Error).message)
    }
  }, [taxRatesWithNumbers])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    await processFile(selectedFile)
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      
      // Check file type
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
        alert('Please upload a CSV or Excel file.')
        return
      }
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.')
        return
      }
      
      await processFile(file)
    }
  }, [processFile])

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMappings(prev => ({
      ...prev,
      [sourceColumn]: targetField,
    }))
  }

  const handlePreview = () => {
    if (!parsedData) return
    
    console.log('Final mappings when previewing:', mappings)
    
    const columnMappings: ColumnMapping[] = Object.entries(mappings)
      .filter(([_, target]) => target !== '')
      .map(([source, target]) => {
        let transform
        
        // Apply appropriate transform based on field type
        if (['basePrice', 'deliverooPrice', 'uberPrice', 'justeatPrice'].includes(target)) {
          transform = transforms.price
        } else if (target === 'active') {
          transform = transforms.boolean
        } else if (['allergens', 'dietaryInfo'].includes(target)) {
          transform = (value: any) => transforms.array(value)
        } else if (['name', 'description', 'sku', 'barcode', 'category'].includes(target)) {
          transform = transforms.string
        } else if (target === 'displayPrice') {
          transform = transforms.price
        } else if (target.startsWith('tax_')) {
          transform = transforms.taxFlag
        } else if (['name', 'description', 'sku', 'barcode', 'category'].includes(target)) {
          transform = transforms.string
        }
        
        return { sourceColumn: source, targetField: target, transform }
      })
    
    console.log('Filtered column mappings:', columnMappings)
    
    // Apply transformations for preview (but don't modify the original data yet)
    let previewData = applyMappings(parsedData.rows, columnMappings)
    
    // Process tax calculations for preview
    previewData = previewData.map(row => {
      const processedRow = { ...row }
      
      // If we have displayPrice and tax flags, calculate basePrice
      if (row.displayPrice && !row.basePrice) {
        const appliedTaxes = taxRatesWithNumbers.map(taxRate => ({
          rate: taxRate.rate,
          applied: Boolean(row[`tax_${taxRate.id}`])
        }))
        
        processedRow.basePrice = calculateBasePrice(Number(row.displayPrice), appliedTaxes)
      }
      
      return processedRow
    })
    
    const importSummary = generateImportSummary(previewData, columnMappings)
    setSummary(importSummary)
    setStep('preview')
  }

  const handleImport = async () => {
    if (!parsedData || !summary) return
    
    setStep('importing')
    
    const columnMappings: ColumnMapping[] = Object.entries(mappings)
      .filter(([_, target]) => target !== '')
      .map(([source, target]) => {
        let transform
        
        if (['basePrice', 'deliverooPrice', 'uberPrice', 'justeatPrice'].includes(target)) {
          transform = transforms.price
        } else if (target === 'active') {
          transform = transforms.boolean
        } else if (['allergens', 'dietaryInfo'].includes(target)) {
          transform = (value: any) => transforms.array(value)
        } else if (['name', 'description', 'sku', 'barcode', 'category'].includes(target)) {
          transform = transforms.string
        } else if (target === 'displayPrice') {
          transform = transforms.price
        } else if (target.startsWith('tax_')) {
          transform = transforms.taxFlag
        }
        
        return { sourceColumn: source, targetField: target, transform }
      })
    
    let transformedData = applyMappings(parsedData.rows, columnMappings)
    
    // Process tax calculations if we have displayPrice and tax flags
    transformedData = transformedData.map(row => {
      const processedRow = { ...row }
      
      // If we have displayPrice and tax flags, calculate basePrice
      if (row.displayPrice && !row.basePrice) {
        const appliedTaxes = taxRatesWithNumbers.map(taxRate => ({
          rate: taxRate.rate,
          applied: Boolean(row[`tax_${taxRate.id}`])
        }))
        
        processedRow.basePrice = calculateBasePrice(Number(row.displayPrice), appliedTaxes)
      }
      
      // Find the most applicable tax rate for the product
      if (!processedRow.taxRateId) {
        const applicableTaxRate = taxRatesWithNumbers.find(taxRate => 
          Boolean(row[`tax_${taxRate.id}`])
        )
        if (applicableTaxRate) {
          processedRow.taxRateId = applicableTaxRate.id
        }
      }
      
      // Remove tax flag fields as they're not part of the product schema
      taxRatesWithNumbers.forEach(taxRate => {
        delete processedRow[`tax_${taxRate.id}`]
      })
      
      return processedRow
    })
    
    try {
      const result = await importMutation.mutateAsync({
        restaurantId,
        menuId,
        products: transformedData as any,
        options: {
          updateExisting,
          createCategories,
        },
      })
      
      setSummary(prev => prev ? {
        ...prev,
        importResult: result,
      } as any : null)
      
      setStep('complete')
    } catch (error) {
      alert('Import failed: ' + (error as Error).message)
      setStep('preview')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {['upload', 'mapping', 'preview', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-medium
                ${step === s ? 'bg-blue-600 text-white' : 
                  ['upload', 'mapping', 'preview', 'complete'].indexOf(step) > i ? 
                  'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}
              `}>
                {i + 1}
              </div>
              {i < 3 && (
                <div className={`w-20 h-1 mx-2 ${
                  ['upload', 'mapping', 'preview', 'complete'].indexOf(step) > i ? 
                  'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-4">Upload Menu File</h2>
          <p className="text-gray-600 mb-6">
            Upload a CSV or Excel file containing your menu items. 
            We'll help you map the columns to the right fields.
          </p>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg className={`mx-auto h-12 w-12 mb-4 ${
              isDragOver ? 'text-blue-500' : 'text-gray-400'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            {isDragOver ? (
              <p className="text-blue-600 font-medium mb-2">Drop file here</p>
            ) : (
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Choose a file
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                />
              </label>
            )}
            
            <p className="text-sm text-gray-500 mt-2">
              CSV or Excel files up to 10MB
            </p>
          </div>
          
          {file && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            </div>
          )}
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'mapping' && parsedData && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-4">Map Columns</h2>
          <p className="text-gray-600 mb-6">
            Match your file's columns to the product fields. 
            We've auto-detected some mappings for you.
          </p>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {parsedData.columns.map(column => (
              <div key={column.header} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium">{column.header}</p>
                  <p className="text-sm text-gray-500">
                    Sample: {column.samples.slice(0, 2).join(', ')}
                  </p>
                </div>
                <select
                  value={mappings[column.header] || ''}
                  onChange={(e) => handleMappingChange(column.header, e.target.value)}
                  className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {getFieldOptions(taxRatesWithNumbers).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Back
            </button>
            <button
              onClick={handlePreview}
              disabled={!Object.values(mappings).some(v => v === 'name')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview Import
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && summary && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-4">Preview Import</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold">{summary.totalRows}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Valid Products</p>
              <p className="text-2xl font-semibold text-green-600">{summary.validRows}</p>
            </div>
          </div>
          
          {summary.errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <p className="font-medium text-red-900 mb-2">
                {summary.errors.length} validation error(s) found:
              </p>
              <ul className="text-sm text-red-700 space-y-1">
                {summary.errors.slice(0, 5).map((error, i) => (
                  <li key={i}>
                    Row {error.row}: {error.message} ({error.field})
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {summary.duplicates.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <p className="font-medium text-yellow-900 mb-2">
                {summary.duplicates.length} duplicate product name(s) found:
              </p>
              <p className="text-sm text-yellow-700">
                {summary.duplicates.slice(0, 5).join(', ')}
              </p>
            </div>
          )}
          
          <div className="mb-6 space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="mr-2"
              />
              <span>Update existing products with matching names/SKUs</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={createCategories}
                onChange={(e) => setCreateCategories(e.target.checked)}
                className="mr-2"
              />
              <span>Automatically create new categories</span>
            </label>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setStep('mapping')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Import {summary.validRows} Products
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Importing products...</p>
          <p className="text-sm text-gray-600 mt-2">This may take a few moments</p>
        </div>
      )}

      {step === 'complete' && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mx-auto h-12 w-12 text-green-600 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-4">Import Complete!</h2>
          
          {(summary as any)?.importResult && (
            <div className="mb-6 space-y-2">
              <p className="text-green-600">
                ✓ {(summary as any).importResult.created} products created
              </p>
              {(summary as any).importResult.updated > 0 && (
                <p className="text-blue-600">
                  ✓ {(summary as any).importResult.updated} products updated
                </p>
              )}
              {(summary as any).importResult.skipped > 0 && (
                <p className="text-yellow-600">
                  ⚠ {(summary as any).importResult.skipped} products skipped
                </p>
              )}
              {(summary as any).importResult.errors?.length > 0 && (
                <p className="text-red-600">
                  ✗ {(summary as any).importResult.errors.length} errors
                </p>
              )}
            </div>
          )}
          
          <button
            onClick={onComplete}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}