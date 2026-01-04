/**
 * Seasonal & Holiday Menu Templates
 *
 * Festive templates for special occasions and seasons.
 * Perfect for Christmas, Summer, Halloween, Valentine's Day, and Autumn menus.
 */

import { generateTemplate, createTemplate, type TemplateConfig } from './generator'

export const seasonalTemplates: TemplateConfig[] = [
  createTemplate(
    'Christmas Feast',
    'seasonal',
    'warm',
    'serif',
    'a4Portrait',
    ['christmas', 'festive', 'holiday', 'winter']
  ),

  createTemplate(
    'Summer Fresh',
    'seasonal',
    'vibrant',
    'sansSerif',
    'a4Landscape',
    ['summer', 'fresh', 'bright', 'seasonal']
  ),

  createTemplate(
    'Halloween Spooky',
    'seasonal',
    'vintage',
    'handwritten',
    'a4Portrait',
    ['halloween', 'spooky', 'dark', 'festive']
  ),

  createTemplate(
    'Valentine\'s Romance',
    'seasonal',
    'elegant',
    'handwritten',
    'letterPortrait',
    ['valentines', 'romantic', 'elegant', 'love']
  ),

  createTemplate(
    'Autumn Harvest',
    'seasonal',
    'rustic',
    'serif',
    'a4Portrait',
    ['autumn', 'harvest', 'fall', 'seasonal']
  ),
]

export function generateSeasonalTemplates() {
  return seasonalTemplates.map(config => ({
    ...config,
    templateData: generateTemplate(config),
    thumbnail: null,
  }))
}

export default seasonalTemplates
