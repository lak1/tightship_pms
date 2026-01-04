/**
 * Templates Index
 *
 * Central export for all 50+ menu templates across 10 categories.
 */

import { generateFineDiningTemplates } from './fine-dining'
import { generateCasualDiningTemplates } from './casual'
import { generateFastFoodTemplates } from './fast-food'
import { generateCafeTemplates } from './cafe'
import { generateBarTemplates } from './bar'
import { generateEthnicTemplates } from './ethnic'
import { generateSeasonalTemplates } from './seasonal'
import { generateDigitalTemplates } from './digital'
import { generateTakeawayTemplates } from './takeaway'
import { generateDietaryTemplates } from './dietary'

export interface TemplateWithData {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  templateData: any
  thumbnail: string | null
}

/**
 * Get all templates (50+ total)
 */
export function getAllTemplates(): TemplateWithData[] {
  return [
    ...generateFineDiningTemplates(),
    ...generateCasualDiningTemplates(),
    ...generateFastFoodTemplates(),
    ...generateCafeTemplates(),
    ...generateBarTemplates(),
    ...generateEthnicTemplates(),
    ...generateSeasonalTemplates(),
    ...generateDigitalTemplates(),
    ...generateTakeawayTemplates(),
    ...generateDietaryTemplates(),
  ]
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): TemplateWithData[] {
  const categoryMap: Record<string, () => TemplateWithData[]> = {
    'fine-dining': generateFineDiningTemplates,
    'casual-dining': generateCasualDiningTemplates,
    'fast-food': generateFastFoodTemplates,
    'cafe': generateCafeTemplates,
    'bar': generateBarTemplates,
    'ethnic': generateEthnicTemplates,
    'seasonal': generateSeasonalTemplates,
    'digital': generateDigitalTemplates,
    'takeaway': generateTakeawayTemplates,
    'dietary': generateDietaryTemplates,
  }

  const generator = categoryMap[category]
  return generator ? generator() : []
}

/**
 * Get all available categories
 */
export function getCategories() {
  return [
    { id: 'fine-dining', name: 'Fine Dining', count: 5 },
    { id: 'casual-dining', name: 'Casual Dining', count: 5 },
    { id: 'fast-food', name: 'Fast Food', count: 5 },
    { id: 'cafe', name: 'Cafe & Coffee', count: 5 },
    { id: 'bar', name: 'Bar & Pub', count: 5 },
    { id: 'ethnic', name: 'Ethnic Cuisine', count: 5 },
    { id: 'seasonal', name: 'Seasonal', count: 5 },
    { id: 'digital', name: 'Digital Display', count: 5 },
    { id: 'takeaway', name: 'Takeaway', count: 5 },
    { id: 'dietary', name: 'Special Diet', count: 5 },
  ]
}

/**
 * Search templates by keyword
 */
export function searchTemplates(query: string): TemplateWithData[] {
  const allTemplates = getAllTemplates()
  const lowerQuery = query.toLowerCase()

  return allTemplates.filter(template =>
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

// Re-export individual template generators
export {
  generateFineDiningTemplates,
  generateCasualDiningTemplates,
  generateFastFoodTemplates,
  generateCafeTemplates,
  generateBarTemplates,
  generateEthnicTemplates,
  generateSeasonalTemplates,
  generateDigitalTemplates,
  generateTakeawayTemplates,
  generateDietaryTemplates,
}

// Re-export types
export type { TemplateConfig, ColorPalette, Typography, LayoutConfig } from './generator'
