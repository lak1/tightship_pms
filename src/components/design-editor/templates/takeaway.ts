/**
 * Takeaway & Delivery Menu Templates
 *
 * Compact, info-dense templates for delivery and takeaway services.
 * Perfect for flyers, delivery menus, and quick reference cards.
 */

import { generateTemplate, createTemplate, type TemplateConfig } from './generator'

export const takeawayTemplates: TemplateConfig[] = [
  createTemplate(
    'Takeaway Flyer',
    'takeaway',
    'vibrant',
    'sansSerif',
    'a4Portrait',
    ['takeaway', 'flyer', 'colorful', 'promotional']
  ),

  createTemplate(
    'Delivery Menu',
    'takeaway',
    'modern',
    'modern',
    'letterPortrait',
    ['delivery', 'modern', 'organized', 'clean']
  ),

  createTemplate(
    'To-Go Specials',
    'takeaway',
    'warm',
    'bold',
    'a4Portrait',
    ['to-go', 'specials', 'promotional', 'deals']
  ),

  createTemplate(
    'Quick Pickup',
    'takeaway',
    'minimalist',
    'sansSerif',
    'a4Portrait',
    ['pickup', 'quick', 'simple', 'fast']
  ),

  createTemplate(
    'Compact Driver Card',
    'takeaway',
    'minimalist',
    'bold',
    'square',
    ['compact', 'driver', 'small', 'efficient']
  ),
]

export function generateTakeawayTemplates() {
  return takeawayTemplates.map(config => ({
    ...config,
    templateData: generateTemplate(config),
    thumbnail: null,
  }))
}

export default takeawayTemplates
