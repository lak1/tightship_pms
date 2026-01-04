/**
 * Special Diet Menu Templates
 *
 * Templates focused on dietary requirements and allergen information.
 * Perfect for vegan, vegetarian, gluten-free, keto, and allergy-aware menus.
 */

import { generateTemplate, createTemplate, type TemplateConfig } from './generator'

export const dietaryTemplates: TemplateConfig[] = [
  createTemplate(
    'Vegan Menu',
    'dietary',
    'modern',
    'modern',
    'a4Portrait',
    ['vegan', 'plant-based', 'modern', 'healthy']
  ),

  createTemplate(
    'Gluten-Free',
    'dietary',
    'minimalist',
    'sansSerif',
    'a4Portrait',
    ['gluten-free', 'allergen', 'safe', 'clean']
  ),

  createTemplate(
    'Keto Friendly',
    'dietary',
    'cool',
    'modern',
    'letterPortrait',
    ['keto', 'low-carb', 'healthy', 'modern']
  ),

  createTemplate(
    'Vegetarian Delight',
    'dietary',
    'warm',
    'sansSerif',
    'a4Portrait',
    ['vegetarian', 'fresh', 'healthy', 'natural']
  ),

  createTemplate(
    'Allergy Aware',
    'dietary',
    'minimalist',
    'sansSerif',
    'a4Landscape',
    ['allergy', 'allergen', 'safe', 'informative']
  ),
]

export function generateDietaryTemplates() {
  return dietaryTemplates.map(config => ({
    ...config,
    templateData: generateTemplate(config),
    thumbnail: null,
  }))
}

export default dietaryTemplates
