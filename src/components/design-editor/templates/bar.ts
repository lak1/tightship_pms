/**
 * Bar & Pub Menu Templates
 *
 * Dark, moody templates with bold typography and high contrast.
 * Perfect for bars, pubs, cocktail lounges, and wine bars.
 */

import { generateTemplate, createTemplate, type TemplateConfig } from './generator'

export const barTemplates: TemplateConfig[] = [
  createTemplate(
    'Classic Pub',
    'bar',
    'rustic',
    'serif',
    'a4Portrait',
    ['pub', 'traditional', 'classic', 'beer']
  ),

  createTemplate(
    'Modern Cocktail Bar',
    'bar',
    'minimalist',
    'modern',
    'a4Portrait',
    ['modern', 'cocktails', 'sleek', 'sophisticated']
  ),

  createTemplate(
    'Vintage Speakeasy',
    'bar',
    'vintage',
    'serif',
    'letterPortrait',
    ['vintage', 'speakeasy', 'prohibition', 'retro']
  ),

  createTemplate(
    'Urban Beer Hall',
    'bar',
    'cool',
    'bold',
    'a4Landscape',
    ['urban', 'beer', 'industrial', 'modern']
  ),

  createTemplate(
    'Wine Bar Elegance',
    'bar',
    'elegant',
    'serif',
    'a4Portrait',
    ['wine', 'elegant', 'sophisticated', 'upscale']
  ),
]

export function generateBarTemplates() {
  return barTemplates.map(config => ({
    ...config,
    templateData: generateTemplate(config),
    thumbnail: null,
  }))
}

export default barTemplates
