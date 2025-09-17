// Label Database - Based on open source label size standards
// Sources: Avery, Herma, OnlineLabels, WorldLabel databases
// All measurements in millimeters

export interface LabelSize {
  id: string
  name: string
  brand?: string
  width: number
  height: number
  columns: number
  rows: number
  topMargin: number
  leftMargin: number
  rightMargin?: number
  bottomMargin?: number
  horizontalSpacing: number
  verticalSpacing: number
  pageWidth: number
  pageHeight: number
  description?: string
  category: 'address' | 'shipping' | 'product' | 'food' | 'round' | 'custom' | 'specialty'
  compatible?: string[] // Compatible with other brand codes
}

export const LABEL_DATABASE: Record<string, LabelSize> = {
  // === AVERY LABELS ===

  // Address Labels
  'avery-5160': {
    id: 'avery-5160',
    name: 'Avery 5160 / L7160',
    brand: 'Avery',
    width: 63.5,
    height: 38.1,
    columns: 3,
    rows: 7,
    topMargin: 15.5,
    leftMargin: 6.35,
    horizontalSpacing: 2.54,
    verticalSpacing: 0,
    pageWidth: 215.9,
    pageHeight: 279.4,
    description: 'Standard address labels - most popular size',
    category: 'address',
    compatible: ['avery-l7160', 'herma-4200', 'onlinelabels-ol150']
  },

  'avery-5161': {
    id: 'avery-5161',
    name: 'Avery 5161 / L7161',
    brand: 'Avery',
    width: 101.6,
    height: 33.9,
    columns: 2,
    rows: 10,
    topMargin: 12.7,
    leftMargin: 6.35,
    horizontalSpacing: 3.18,
    verticalSpacing: 0,
    pageWidth: 215.9,
    pageHeight: 279.4,
    description: 'Wide address labels',
    category: 'address',
    compatible: ['avery-l7161']
  },

  'avery-5162': {
    id: 'avery-5162',
    name: 'Avery 5162 / L7162',
    brand: 'Avery',
    width: 99.1,
    height: 33.9,
    columns: 2,
    rows: 8,
    topMargin: 15,
    leftMargin: 4.65,
    horizontalSpacing: 4.65,
    verticalSpacing: 0,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Large address labels - A4 format',
    category: 'address',
    compatible: ['avery-l7162']
  },

  'avery-5163': {
    id: 'avery-5163',
    name: 'Avery 5163 / L7163',
    brand: 'Avery',
    width: 99.1,
    height: 38.1,
    columns: 2,
    rows: 7,
    topMargin: 15,
    leftMargin: 4.65,
    horizontalSpacing: 4.65,
    verticalSpacing: 0,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Large shipping labels - A4 format',
    category: 'shipping',
    compatible: ['avery-l7163']
  },

  // Shipping Labels
  'avery-5164': {
    id: 'avery-5164',
    name: 'Avery 5164 / L7169',
    brand: 'Avery',
    width: 99.1,
    height: 67.7,
    columns: 2,
    rows: 4,
    topMargin: 15,
    leftMargin: 4.65,
    horizontalSpacing: 4.65,
    verticalSpacing: 0,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Large shipping labels',
    category: 'shipping',
    compatible: ['avery-l7169']
  },

  'avery-5165': {
    id: 'avery-5165',
    name: 'Avery 5165 / L7165',
    brand: 'Avery',
    width: 99.1,
    height: 93.1,
    columns: 2,
    rows: 3,
    topMargin: 15,
    leftMargin: 4.65,
    horizontalSpacing: 4.65,
    verticalSpacing: 0,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Full-size shipping labels',
    category: 'shipping',
    compatible: ['avery-l7165']
  },

  // Product Labels
  'avery-22808': {
    id: 'avery-22808',
    name: 'Avery 22808',
    brand: 'Avery',
    width: 50.8,
    height: 22.2,
    columns: 4,
    rows: 10,
    topMargin: 13.5,
    leftMargin: 5.3,
    horizontalSpacing: 0,
    verticalSpacing: 2.5,
    pageWidth: 215.9,
    pageHeight: 279.4,
    description: 'Small product labels',
    category: 'product'
  },

  'avery-l4732': {
    id: 'avery-l4732',
    name: 'Avery L4732',
    brand: 'Avery',
    width: 35,
    height: 35,
    columns: 5,
    rows: 8,
    topMargin: 13,
    leftMargin: 7.5,
    horizontalSpacing: 2.5,
    verticalSpacing: 0,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Square labels - perfect for ingredients',
    category: 'food'
  },

  // Round Labels
  'avery-22817': {
    id: 'avery-22817',
    name: 'Avery 22817',
    brand: 'Avery',
    width: 31.8,
    height: 31.8,
    columns: 6,
    rows: 8,
    topMargin: 13.3,
    leftMargin: 5.3,
    horizontalSpacing: 0,
    verticalSpacing: 2.5,
    pageWidth: 215.9,
    pageHeight: 279.4,
    description: 'Round labels 1.25"',
    category: 'round'
  },

  'avery-l7780': {
    id: 'avery-l7780',
    name: 'Avery L7780',
    brand: 'Avery',
    width: 20,
    height: 20,
    columns: 9,
    rows: 13,
    topMargin: 13.5,
    leftMargin: 5,
    horizontalSpacing: 2.5,
    verticalSpacing: 2.5,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Small round dots',
    category: 'round'
  },

  // === HERMA LABELS ===

  'herma-4200': {
    id: 'herma-4200',
    name: 'Herma 4200',
    brand: 'Herma',
    width: 63.5,
    height: 38.1,
    columns: 3,
    rows: 7,
    topMargin: 15.5,
    leftMargin: 6.35,
    horizontalSpacing: 2.54,
    verticalSpacing: 0,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Universal address labels',
    category: 'address',
    compatible: ['avery-5160', 'avery-l7160']
  },

  'herma-4201': {
    id: 'herma-4201',
    name: 'Herma 4201',
    brand: 'Herma',
    width: 99.1,
    height: 33.9,
    columns: 2,
    rows: 8,
    topMargin: 21.2,
    leftMargin: 4.7,
    horizontalSpacing: 4.7,
    verticalSpacing: 0,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Large address labels',
    category: 'address',
    compatible: ['avery-l7162']
  },

  'herma-4203': {
    id: 'herma-4203',
    name: 'Herma 4203',
    brand: 'Herma',
    width: 105,
    height: 57,
    columns: 2,
    rows: 5,
    topMargin: 8.5,
    leftMargin: 0,
    horizontalSpacing: 0,
    verticalSpacing: 0,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Large shipping labels',
    category: 'shipping'
  },

  // Food Industry Specific
  'herma-4050': {
    id: 'herma-4050',
    name: 'Herma 4050',
    brand: 'Herma',
    width: 45.7,
    height: 21.2,
    columns: 4,
    rows: 12,
    topMargin: 15.3,
    leftMargin: 5.4,
    horizontalSpacing: 2.5,
    verticalSpacing: 2.5,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Small food labels - perfect for ingredients',
    category: 'food'
  },

  // === ONLINELABELS ===

  'ol150': {
    id: 'ol150',
    name: 'OnlineLabels OL150',
    brand: 'OnlineLabels',
    width: 63.5,
    height: 38.1,
    columns: 3,
    rows: 7,
    topMargin: 15.5,
    leftMargin: 6.35,
    horizontalSpacing: 2.54,
    verticalSpacing: 0,
    pageWidth: 215.9,
    pageHeight: 279.4,
    description: 'Standard address labels',
    category: 'address',
    compatible: ['avery-5160', 'herma-4200']
  },

  'ol325': {
    id: 'ol325',
    name: 'OnlineLabels OL325',
    brand: 'OnlineLabels',
    width: 83.8,
    height: 25.4,
    columns: 2,
    rows: 10,
    topMargin: 12.7,
    leftMargin: 22.2,
    horizontalSpacing: 25.4,
    verticalSpacing: 2.54,
    pageWidth: 215.9,
    pageHeight: 279.4,
    description: 'CD/DVD labels',
    category: 'specialty'
  },

  // === WORLDLABEL ===

  'wl-ol175': {
    id: 'wl-ol175',
    name: 'WorldLabel WL-OL175',
    brand: 'WorldLabel',
    width: 66.7,
    height: 25.4,
    columns: 3,
    rows: 10,
    topMargin: 12.7,
    leftMargin: 6.35,
    horizontalSpacing: 2.54,
    verticalSpacing: 2.54,
    pageWidth: 215.9,
    pageHeight: 279.4,
    description: 'Return address labels',
    category: 'address'
  },

  // === FOOD INDUSTRY SPECIFIC ===

  'food-allergen-small': {
    id: 'food-allergen-small',
    name: 'Food Allergen Labels (Small)',
    width: 50,
    height: 25,
    columns: 4,
    rows: 11,
    topMargin: 10,
    leftMargin: 5,
    horizontalSpacing: 2.5,
    verticalSpacing: 2.5,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Optimized for allergen warnings',
    category: 'food'
  },

  'food-ingredient-large': {
    id: 'food-ingredient-large',
    name: 'Food Ingredient Labels (Large)',
    width: 105,
    height: 40,
    columns: 2,
    rows: 7,
    topMargin: 8.5,
    leftMargin: 0,
    horizontalSpacing: 0,
    verticalSpacing: 2.5,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Large format for full ingredient lists',
    category: 'food'
  },

  'food-natasha-compliance': {
    id: 'food-natasha-compliance',
    name: "Natasha's Law Compliance",
    width: 70,
    height: 30,
    columns: 3,
    rows: 9,
    topMargin: 10,
    leftMargin: 0,
    horizontalSpacing: 0,
    verticalSpacing: 3,
    pageWidth: 210,
    pageHeight: 297,
    description: 'Optimized for UK food labelling requirements',
    category: 'food'
  },

  // === SPECIALTY FORMATS ===

  'dymo-30252': {
    id: 'dymo-30252',
    name: 'Dymo 30252',
    brand: 'Dymo',
    width: 62,
    height: 28,
    columns: 1,
    rows: 1,
    topMargin: 0,
    leftMargin: 0,
    horizontalSpacing: 0,
    verticalSpacing: 0,
    pageWidth: 62,
    pageHeight: 28,
    description: 'Dymo LabelWriter address labels',
    category: 'specialty'
  },

  'dymo-30323': {
    id: 'dymo-30323',
    name: 'Dymo 30323',
    brand: 'Dymo',
    width: 54,
    height: 25,
    columns: 1,
    rows: 1,
    topMargin: 0,
    leftMargin: 0,
    horizontalSpacing: 0,
    verticalSpacing: 0,
    pageWidth: 54,
    pageHeight: 25,
    description: 'Dymo LabelWriter shipping labels',
    category: 'specialty'
  },

  // === CUSTOM TEMPLATE ===
  'custom': {
    id: 'custom',
    name: 'Custom Size',
    width: 70,
    height: 30,
    columns: 2,
    rows: 10,
    topMargin: 10,
    leftMargin: 10,
    horizontalSpacing: 5,
    verticalSpacing: 2,
    pageWidth: 210,
    pageHeight: 297,
    description: 'User-defined custom label size',
    category: 'custom'
  }
}

// Helper functions
export const getLabelsByCategory = (category: LabelSize['category']) => {
  return Object.values(LABEL_DATABASE).filter(label => label.category === category)
}

export const getLabelsByBrand = (brand: string) => {
  return Object.values(LABEL_DATABASE).filter(label => label.brand === brand)
}

export const searchLabels = (query: string) => {
  const searchTerm = query.toLowerCase()
  return Object.values(LABEL_DATABASE).filter(label =>
    label.name.toLowerCase().includes(searchTerm) ||
    label.description?.toLowerCase().includes(searchTerm) ||
    label.brand?.toLowerCase().includes(searchTerm)
  )
}

export const getLabelCategories = () => {
  const categories = new Set(Object.values(LABEL_DATABASE).map(label => label.category))
  return Array.from(categories)
}

export const getLabelBrands = () => {
  const brands = new Set(Object.values(LABEL_DATABASE).map(label => label.brand).filter(Boolean))
  return Array.from(brands)
}