/**
 * Fast Food Menu Templates
 *
 * Bold, high-contrast templates with large fonts and vibrant colors.
 * Perfect for quick-service restaurants, fast food chains, and takeout spots.
 */

import { generateTemplate, createTemplate, type TemplateConfig } from './generator'

export const fastFoodTemplates: TemplateConfig[] = [
  createTemplate(
    'Bold & Bright',
    'fast-food',
    'vibrant',
    'bold',
    'digital1080p',
    ['bold', 'colorful', 'energetic', 'fast']
  ),

  createTemplate(
    'Quick Bites',
    'fast-food',
    'warm',
    'bold',
    'a4Portrait',
    ['quick', 'simple', 'easy', 'fast']
  ),

  createTemplate(
    'Street Food Style',
    'fast-food',
    'modern',
    'sansSerif',
    'a4Landscape',
    ['street', 'urban', 'trendy', 'casual']
  ),

  createTemplate(
    'Classic Fast Food',
    'fast-food',
    'vibrant',
    'sansSerif',
    'letterPortrait',
    ['classic', 'traditional', 'familiar', 'reliable']
  ),

  createTemplate(
    'Digital Board',
    'fast-food',
    'minimalist',
    'bold',
    'digitalPortrait',
    ['digital', 'modern', 'clean', 'bold']
  ),
]

export function generateFastFoodTemplates() {
  return fastFoodTemplates.map(config => ({
    ...config,
    templateData: generateTemplate(config),
    thumbnail: null,
  }))
}

export default fastFoodTemplates
