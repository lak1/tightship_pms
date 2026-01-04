/**
 * Fine Dining Menu Templates
 *
 * Elegant, sophisticated templates with serif fonts and refined color schemes.
 * Perfect for upscale restaurants, fine dining establishments, and gourmet experiences.
 */

import {
  generateTemplate,
  generateTemplateVariations,
  createTemplate,
  type TemplateConfig
} from './generator'

export const fineDiningTemplates: TemplateConfig[] = [
  // 1. Classic Elegance - A4 Portrait
  createTemplate(
    'Classic Elegance',
    'fine-dining',
    'elegant',
    'serif',
    'a4Portrait',
    ['classic', 'elegant', 'formal', 'traditional']
  ),

  // 2. Modern Luxury - A4 Portrait
  createTemplate(
    'Modern Luxury',
    'fine-dining',
    'minimalist',
    'modern',
    'a4Portrait',
    ['modern', 'luxury', 'minimal', 'contemporary']
  ),

  // 3. Vintage Prestige - A4 Landscape
  createTemplate(
    'Vintage Prestige',
    'fine-dining',
    'vintage',
    'serif',
    'a4Landscape',
    ['vintage', 'classic', 'upscale', 'formal']
  ),

  // 4. Gold Standard - Letter Portrait
  createTemplate(
    'Gold Standard',
    'fine-dining',
    'warm',
    'serif',
    'letterPortrait',
    ['luxury', 'elegant', 'premium', 'gold']
  ),

  // 5. Refined Simplicity - A4 Portrait
  createTemplate(
    'Refined Simplicity',
    'fine-dining',
    'cool',
    'modern',
    'a4Portrait',
    ['minimal', 'clean', 'sophisticated', 'modern']
  ),
]

/**
 * Generate Fabric.js JSON for all fine dining templates
 */
export function generateFineDiningTemplates() {
  return fineDiningTemplates.map(config => ({
    ...config,
    templateData: generateTemplate(config),
    thumbnail: null, // Will be generated on first use
  }))
}

export default fineDiningTemplates
