/**
 * Cafe & Coffee Shop Menu Templates
 *
 * Warm, cozy templates with handwritten accents and inviting colors.
 * Perfect for cafes, coffee shops, bakeries, and tea rooms.
 */

import { generateTemplate, createTemplate, type TemplateConfig } from './generator'

export const cafeTemplates: TemplateConfig[] = [
  createTemplate(
    'Cozy Corner',
    'cafe',
    'warm',
    'handwritten',
    'a4Portrait',
    ['cozy', 'warm', 'inviting', 'comfortable']
  ),

  createTemplate(
    'Artisan Coffee',
    'cafe',
    'rustic',
    'serif',
    'letterPortrait',
    ['artisan', 'craft', 'specialty', 'quality']
  ),

  createTemplate(
    'Modern Brew',
    'cafe',
    'minimalist',
    'modern',
    'a4Landscape',
    ['modern', 'clean', 'minimalist', 'contemporary']
  ),

  createTemplate(
    'Vintage Cafe',
    'cafe',
    'vintage',
    'handwritten',
    'a4Portrait',
    ['vintage', 'retro', 'classic', 'nostalgic']
  ),

  createTemplate(
    'Urban Coffee Bar',
    'cafe',
    'cool',
    'sansSerif',
    'square',
    ['urban', 'hip', 'trendy', 'cool']
  ),
]

export function generateCafeTemplates() {
  return cafeTemplates.map(config => ({
    ...config,
    templateData: generateTemplate(config),
    thumbnail: null,
  }))
}

export default cafeTemplates
