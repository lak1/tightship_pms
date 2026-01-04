/**
 * Digital Display Menu Templates
 *
 * Templates optimized for digital screens and signage.
 * Perfect for TV displays, digital menu boards, and electronic signage.
 */

import { generateTemplate, createTemplate, type TemplateConfig } from './generator'

export const digitalTemplates: TemplateConfig[] = [
  createTemplate(
    'Digital Menu Board',
    'digital',
    'minimalist',
    'bold',
    'digital1080p',
    ['digital', 'screen', 'modern', 'high-contrast']
  ),

  createTemplate(
    'Portrait Signage',
    'digital',
    'modern',
    'bold',
    'digitalPortrait',
    ['vertical', 'digital', 'signage', 'modern']
  ),

  createTemplate(
    'Wide Screen Display',
    'digital',
    'modern',
    'modern',
    'digital1080p',
    ['widescreen', 'hd', 'digital', 'clean']
  ),

  createTemplate(
    'Quick Service Board',
    'digital',
    'vibrant',
    'bold',
    'digital1080p',
    ['fast-food', 'digital', 'bold', 'colorful']
  ),

  createTemplate(
    'Upscale Digital Lounge',
    'digital',
    'elegant',
    'modern',
    'digital1080p',
    ['upscale', 'digital', 'elegant', 'lounge']
  ),
]

export function generateDigitalTemplates() {
  return digitalTemplates.map(config => ({
    ...config,
    templateData: generateTemplate(config),
    thumbnail: null,
  }))
}

export default digitalTemplates
