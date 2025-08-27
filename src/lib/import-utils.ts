import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ImportColumn {
  index: number
  header: string
  samples: string[]
}

export interface ColumnMapping {
  sourceColumn: string
  targetField: string
  transform?: (value: any) => any
}

export interface ParsedData {
  headers: string[]
  rows: Record<string, any>[]
  columns: ImportColumn[]
}

// Smart column name detection patterns
const COLUMN_PATTERNS = {
  name: /^(product[\s_-]?)?name$|^title$|^item$|^dish$/i,
  category: /^category$|^type$|^group$|^section$/i,
  basePrice: /^(base[\s_-]?)?cost$/i,
  displayPrice: /^(display[\s_-]?)?price(?:\s*\[.*\])?$|^final[\s_-]?price|^inc[\s_-]?tax|^including[\s_-]?tax$/i,
  description: /^desc(ription)?$|^details?$|^info$/i,
  sku: /^sku$|^(product[\s_-]?)?(code|id)$/i,
  barcode: /^barcode$|^ean$|^upc$|^gtin$/i,
  deliverooPrice: /^deliveroo[\s_-]?price|deliveroo$/i,
  uberPrice: /^uber[\s_-]?(eats)?[\s_-]?price|uber$/i,
  justeatPrice: /^just[\s_-]?eat[\s_-]?price|justeat|je$/i,
  allergens: /^allergen|allergy|allergies$/i,
  dietary: /^dietary|diet|suitable[\s_-]?for$/i,
  taxRate: /^tax[\s_-]?rate|vat|tax[\s_-]?%$/i,
  active: /^active$|^enabled$|^available(?:\s*\[.*\])?$/i,
  modifiers: /^modifiers?$|^options?$|^extras?$/i,
}

// Detect column type from header name
export function detectColumnType(header: string): string | null {
  const normalizedHeader = header.trim().toLowerCase()
  
  for (const [field, pattern] of Object.entries(COLUMN_PATTERNS)) {
    if (pattern.test(normalizedHeader)) {
      return field
    }
  }
  
  return null
}

// Parse CSV file
export async function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        const rows = results.data as Record<string, any>[]
        
        // Get sample values for each column
        const columns: ImportColumn[] = headers.map((header, index) => ({
          index,
          header,
          samples: rows.slice(0, 3).map(row => String(row[header] || '')),
        }))
        
        resolve({ headers, rows, columns })
      },
      error: reject,
    })
  })
}

// Parse Excel file
export async function parseExcel(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet, { 
          raw: false,
          dateNF: 'yyyy-mm-dd'
        })
        
        if (jsonData.length === 0) {
          throw new Error('No data found in Excel file')
        }
        
        const headers = Object.keys(jsonData[0] as object)
        const rows = jsonData as Record<string, any>[]
        
        // Get sample values for each column
        const columns: ImportColumn[] = headers.map((header, index) => ({
          index,
          header,
          samples: rows.slice(0, 3).map(row => String(row[header] || '')),
        }))
        
        resolve({ headers, rows, columns })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}

// Parse file based on type
export async function parseFile(file: File): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  
  if (extension === 'csv') {
    return parseCSV(file)
  } else if (['xlsx', 'xls'].includes(extension || '')) {
    return parseExcel(file)
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel file.')
  }
}

// Suggest column mappings based on headers and available tax rates
export function suggestMappings(
  headers: string[], 
  taxRates: Array<{ id: string; name: string; rate: number }> = []
): Record<string, string> {
  const suggestions: Record<string, string> = {}
  const usedMappings = new Set<string>()
  
  // Process headers in priority order to avoid conflicts
  const priorityOrder = ['name', 'displayPrice', 'category', 'basePrice', 'sku', 'barcode', 'description', 'active']
  
  // First pass: handle priority fields
  priorityOrder.forEach(priority => {
    headers.forEach(header => {
      const detectedType = detectColumnType(header)
      if (detectedType === priority && !usedMappings.has(detectedType)) {
        suggestions[header] = detectedType
        usedMappings.add(detectedType)
      }
    })
  })
  
  // Second pass: handle remaining fields and tax rates
  headers.forEach(header => {
    if (suggestions[header]) return // Already mapped
    
    const normalizedHeader = header.trim().toLowerCase()
    const detectedType = detectColumnType(header)
    
    if (detectedType && !usedMappings.has(detectedType)) {
      suggestions[header] = detectedType
      usedMappings.add(detectedType)
    } else {
      // Try to match against tax rate names
      const matchingTaxRate = taxRates.find(taxRate => {
        const taxName = taxRate.name.toLowerCase()
        // Match exact tax name or tax name + common suffixes
        return normalizedHeader.includes(`tax - "${taxName}"`) ||
               normalizedHeader.includes(`"${taxName}"`) ||
               normalizedHeader === taxName ||
               normalizedHeader === `${taxName} applied` ||
               normalizedHeader === `${taxName} tax` ||
               normalizedHeader === `${taxName} (y/n)`
      })
      
      if (matchingTaxRate) {
        suggestions[header] = `tax_${matchingTaxRate.id}`
      }
    }
  })
  
  return suggestions
}

// Get enhanced field options including dynamic tax rates
export function getFieldOptions(taxRates: Array<{ id: string; name: string; rate: number }> = []) {
  const baseOptions = [
    { value: '', label: 'Skip this column' },
    { value: 'name', label: 'Product Name' },
    { value: 'category', label: 'Category' },
    { value: 'basePrice', label: 'Base Price (excluding tax)' },
    { value: 'displayPrice', label: 'Display Price (including tax)' },
    { value: 'description', label: 'Description' },
    { value: 'sku', label: 'SKU / Product Code' },
    { value: 'barcode', label: 'Barcode' },
    { value: 'deliverooPrice', label: 'Deliveroo Price' },
    { value: 'uberPrice', label: 'Uber Eats Price' },
    { value: 'justeatPrice', label: 'Just Eat Price' },
    { value: 'allergens', label: 'Allergens' },
    { value: 'dietaryInfo', label: 'Dietary Info' },
    { value: 'active', label: 'Active/Enabled' },
  ]

  // Add tax rate options
  const taxOptions = taxRates.map(taxRate => ({
    value: `tax_${taxRate.id}`,
    label: `${taxRate.name} Applied (Y/N)`,
  }))

  return [...baseOptions, ...taxOptions]
}

// Transform functions for common data formats
export const transforms = {
  price: (value: any): number => {
    if (typeof value === 'number') return value
    // Remove currency symbols and convert to number
    const cleaned = String(value).replace(/[£€$,]/g, '').trim()
    return parseFloat(cleaned) || 0
  },
  
  boolean: (value: any): boolean => {
    const str = String(value).toLowerCase().trim()
    return ['yes', 'y', 'true', '1', 'active', 'enabled'].includes(str)
  },
  
  array: (value: any, delimiter = ','): string[] => {
    if (Array.isArray(value)) return value
    if (!value) return []
    return String(value).split(delimiter).map(s => s.trim()).filter(Boolean)
  },
  
  taxRate: (value: any): number => {
    if (typeof value === 'number') return value
    const cleaned = String(value).replace(/[%]/g, '').trim()
    const rate = parseFloat(cleaned) || 0
    // Convert percentage to decimal if needed
    return rate > 1 ? rate / 100 : rate
  },

  string: (value: any): string => {
    if (value === null || value === undefined) return ''
    return String(value).trim()
  },

  taxFlag: (value: any): boolean => {
    const str = String(value).toLowerCase().trim()
    return ['yes', 'y', 'true', '1', 'x', '✓', '☑'].includes(str)
  },
}

// Calculate base price from display price and tax rates
export function calculateBasePrice(
  displayPrice: number, 
  appliedTaxes: Array<{ rate: number; applied: boolean }>
): number {
  const totalTaxRate = appliedTaxes
    .filter(tax => tax.applied)
    .reduce((sum, tax) => sum + tax.rate, 0)
  
  return displayPrice / (1 + totalTaxRate)
}

// Validate imported data
export interface ValidationError {
  row: number
  field: string
  value: any
  message: string
}

export function validateImportData(
  transformedRows: Record<string, any>[],
  mappings: ColumnMapping[]
): ValidationError[] {
  const errors: ValidationError[] = []
  
  transformedRows.forEach((row, rowIndex) => {
    // Check required fields
    if (!row.name || String(row.name).trim() === '') {
      errors.push({
        row: rowIndex + 1,
        field: 'name',
        value: row.name,
        message: 'Product name is required',
      })
    }
    
    // Validate price fields
    const priceFields = ['basePrice', 'deliverooPrice', 'uberPrice', 'justeatPrice', 'displayPrice']
    
    priceFields.forEach(fieldName => {
      const value = row[fieldName]
      if (value !== undefined && value !== null && value !== '') {
        const price = typeof value === 'number' ? value : transforms.price(value)
        if (isNaN(price) || price < 0) {
          errors.push({
            row: rowIndex + 1,
            field: fieldName,
            value,
            message: 'Invalid price format',
          })
        }
      }
    })
  })
  
  return errors
}

// Apply mappings to transform raw data
export function applyMappings(
  rows: Record<string, any>[],
  mappings: ColumnMapping[]
): Record<string, any>[] {
  return rows.map(row => {
    const transformed: Record<string, any> = {}
    
    mappings.forEach(mapping => {
      const value = row[mapping.sourceColumn]
      
      // For required string fields, always process them even if empty
      const isRequiredStringField = ['name', 'description', 'sku', 'barcode', 'category'].includes(mapping.targetField)
      
      if ((value !== undefined && value !== null && value !== '') || isRequiredStringField) {
        let transformedValue = mapping.transform 
          ? mapping.transform(value)
          : value
          
        // Force string conversion for known string fields
        if (isRequiredStringField) {
          transformedValue = String(transformedValue || '').trim()
        }
        
        transformed[mapping.targetField] = transformedValue
      }
    })
    
    return transformed
  })
}

// Generate import summary
export interface ImportSummary {
  totalRows: number
  validRows: number
  errors: ValidationError[]
  categories: string[]
  priceRange: { min: number; max: number }
  duplicates: string[]
}

export function generateImportSummary(
  transformedRows: Record<string, any>[],
  mappings: ColumnMapping[]
): ImportSummary {
  const errors = validateImportData(transformedRows, mappings)
  
  const categories = new Set<string>()
  const names = new Map<string, number>()
  let minPrice = Infinity
  let maxPrice = 0
  
  transformedRows.forEach(row => {
    if (row.category) categories.add(row.category)
    
    if (row.name) {
      const count = names.get(row.name) || 0
      names.set(row.name, count + 1)
    }
    
    const price = row.basePrice || row.price || row.displayPrice || 0
    if (price > 0) {
      minPrice = Math.min(minPrice, price)
      maxPrice = Math.max(maxPrice, price)
    }
  })
  
  const duplicates = Array.from(names.entries())
    .filter(([_, count]) => count > 1)
    .map(([name, _]) => name)
  
  return {
    totalRows: transformedRows.length,
    validRows: transformedRows.length - errors.filter(e => e.field === 'name').length,
    errors,
    categories: Array.from(categories),
    priceRange: { 
      min: minPrice === Infinity ? 0 : minPrice, 
      max: maxPrice 
    },
    duplicates,
  }
}