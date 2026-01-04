/**
 * Casual Dining Menu Templates
 *
 * Friendly, approachable templates with modern fonts and warm colors.
 * Perfect for family restaurants, bistros, and casual eateries.
 */

import { generateTemplate, createTemplate, type TemplateConfig } from './generator'

export const casualDiningTemplates: TemplateConfig[] = [
  createTemplate(
    'Friendly Bistro',
    'casual-dining',
    'warm',
    'sansSerif',
    'a4Portrait',
    ['friendly', 'warm', 'welcoming', 'family']
  ),

  createTemplate(
    'Modern Casual',
    'casual-dining',
    'modern',
    'modern',
    'a4Landscape',
    ['modern', 'clean', 'contemporary', 'casual']
  ),

  createTemplate(
    'Vibrant Eatery',
    'casual-dining',
    'vibrant',
    'sansSerif',
    'letterPortrait',
    ['colorful', 'energetic', 'fun', 'vibrant']
  ),

  createTemplate(
    'Rustic Charm',
    'casual-dining',
    'rustic',
    'serif',
    'a4Portrait',
    ['rustic', 'cozy', 'homey', 'traditional']
  ),

  createTemplate(
    'Urban Casual',
    'casual-dining',
    'cool',
    'modern',
    'a4Landscape',
    ['urban', 'trendy', 'contemporary', 'hip']
  ),
]

export function generateCasualDiningTemplates() {
  return casualDiningTemplates.map(config => ({
    ...config,
    templateData: generateTemplate(config),
    thumbnail: null,
  }))
}

export default casualDiningTemplates
