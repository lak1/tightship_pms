/**
 * Ethnic Cuisine Menu Templates
 *
 * Culturally-inspired templates for international restaurants.
 * Perfect for Italian, Asian, Mexican, Indian, and Mediterranean cuisines.
 */

import { generateTemplate, createTemplate, type TemplateConfig } from './generator'

export const ethnicTemplates: TemplateConfig[] = [
  createTemplate(
    'Italian Trattoria',
    'ethnic',
    'warm',
    'serif',
    'a4Portrait',
    ['italian', 'trattoria', 'rustic', 'traditional']
  ),

  createTemplate(
    'Asian Fusion',
    'ethnic',
    'modern',
    'modern',
    'a4Portrait',
    ['asian', 'fusion', 'minimalist', 'zen']
  ),

  createTemplate(
    'Mexican Cantina',
    'ethnic',
    'vibrant',
    'bold',
    'a4Portrait',
    ['mexican', 'colorful', 'festive', 'vibrant']
  ),

  createTemplate(
    'Indian Spice',
    'ethnic',
    'warm',
    'serif',
    'letterPortrait',
    ['indian', 'spice', 'rich', 'aromatic']
  ),

  createTemplate(
    'Mediterranean Coast',
    'ethnic',
    'cool',
    'sansSerif',
    'a4Landscape',
    ['mediterranean', 'fresh', 'coastal', 'healthy']
  ),
]

export function generateEthnicTemplates() {
  return ethnicTemplates.map(config => ({
    ...config,
    templateData: generateTemplate(config),
    thumbnail: null,
  }))
}

export default ethnicTemplates
