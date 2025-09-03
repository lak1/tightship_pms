import { db } from '../db';
import { EmailService } from '../email';
import { SubscriptionManagementService } from './subscription-management';
import { VerificationService } from './verification';
import { logger } from '../logger';
import crypto from 'crypto';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  order: number;
}

export interface OnboardingData {
  // Step 1: User Registration
  name: string;
  email: string;
  password: string;

  // Step 2: Organization Setup
  organizationName: string;
  organizationType?: 'single' | 'multi' | 'franchise';

  // Step 3: First Restaurant
  restaurantName: string;
  restaurantAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  timezone?: string;

  // Step 4: Initial Products (optional)
  skipProductImport?: boolean;
  
  // Step 5: Integrations (optional)
  skipIntegrations?: boolean;
}

export class OnboardingService {
  /**
   * Start the onboarding process
   */
  static async startOnboarding(data: Partial<OnboardingData>): Promise<{
    success: boolean;
    userId?: string;
    nextStep?: string;
    error?: string;
  }> {
    try {
      const { name, email, password } = data;

      if (!name || !email || !password) {
        return {
          success: false,
          error: 'Name, email, and password are required'
        };
      }

      // Check if user already exists
      const existingUser = await db.users.findUnique({
        where: { email }
      });

      if (existingUser) {
        return {
          success: false,
          error: 'An account with this email already exists'
        };
      }

      // Hash password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await db.users.create({
        data: {
          id: `user_${Date.now()}_${Math.random()}`,
          name,
          email,
          password: hashedPassword,
          role: 'OWNER', // First user is always the owner
          isActive: true
        }
      });

      // Send welcome email and verification email
      await Promise.allSettled([
        EmailService.sendWelcomeEmail(email, name),
        VerificationService.sendVerificationEmail(email, name)
      ]);

      logger.info('Onboarding started', {
        userId: user.id,
        email,
        step: 'user_created'
      });

      return {
        success: true,
        userId: user.id,
        nextStep: 'create_organization'
      };

    } catch (error) {
      logger.error('Failed to start onboarding', {
        error: error.message,
        data: { ...data, password: '[REDACTED]' }
      });

      return {
        success: false,
        error: 'Failed to create account. Please try again.'
      };
    }
  }

  /**
   * Create organization (Step 2)
   */
  static async createOrganization(
    userId: string,
    organizationName: string,
    organizationType: 'single' | 'multi' | 'franchise' = 'single'
  ): Promise<{
    success: boolean;
    organizationId?: string;
    nextStep?: string;
    error?: string;
  }> {
    try {
      // Generate unique slug
      const baseSlug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      let slug = baseSlug;
      let counter = 1;
      
      while (await db.organizations.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Create organization
      const organization = await db.organizations.create({
        data: {
          id: `org_${Date.now()}_${Math.random()}`,
          name: organizationName,
          slug,
          settings: {
            type: organizationType,
            onboardingStep: 'create_restaurant'
          }
        }
      });

      // Link user to organization
      await db.users.update({
        where: { id: userId },
        data: { organizationId: organization.id }
      });

      // Create initial subscription (Free tier with trial)
      await SubscriptionManagementService.createInitialSubscription(
        organization.id,
        'FREE'
      );

      logger.info('Organization created during onboarding', {
        userId,
        organizationId: organization.id,
        organizationName,
        step: 'organization_created'
      });

      return {
        success: true,
        organizationId: organization.id,
        nextStep: 'create_restaurant'
      };

    } catch (error) {
      logger.error('Failed to create organization during onboarding', {
        userId,
        organizationName,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to create organization. Please try again.'
      };
    }
  }

  /**
   * Create first restaurant (Step 3)
   */
  static async createFirstRestaurant(
    organizationId: string,
    restaurantData: {
      name: string;
      address?: any;
      timezone?: string;
    }
  ): Promise<{
    success: boolean;
    restaurantId?: string;
    nextStep?: string;
    error?: string;
  }> {
    try {
      const restaurant = await db.restaurants.create({
        data: {
          id: `rest_${Date.now()}_${Math.random()}`,
          organizationId,
          name: restaurantData.name,
          address: restaurantData.address || {},
          timezone: restaurantData.timezone || 'UTC',
          settings: {
            onboardingStep: 'setup_products'
          },
          isActive: true
        }
      });

      // Create default menu
      const menu = await db.menus.create({
        data: {
          id: `menu_${Date.now()}_${Math.random()}`,
          restaurantId: restaurant.id,
          name: 'Main Menu',
          description: 'Your primary menu',
          isActive: true
        }
      });

      // Update organization onboarding step
      await db.organizations.update({
        where: { id: organizationId },
        data: {
          settings: {
            onboardingStep: 'setup_products'
          }
        }
      });

      logger.info('First restaurant created during onboarding', {
        organizationId,
        restaurantId: restaurant.id,
        menuId: menu.id,
        step: 'restaurant_created'
      });

      return {
        success: true,
        restaurantId: restaurant.id,
        nextStep: 'setup_products'
      };

    } catch (error) {
      logger.error('Failed to create first restaurant during onboarding', {
        organizationId,
        restaurantData,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to create restaurant. Please try again.'
      };
    }
  }

  /**
   * Complete onboarding
   */
  static async completeOnboarding(
    organizationId: string,
    skipOptionalSteps: boolean = false
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Update organization to mark onboarding as complete
      await db.organizations.update({
        where: { id: organizationId },
        data: {
          settings: {
            onboardingCompleted: true,
            onboardingCompletedAt: new Date().toISOString(),
            onboardingStep: 'completed'
          }
        }
      });

      // Get user for welcome email
      const user = await db.users.findFirst({
        where: { organizationId },
        include: { organizations: true }
      });

      if (user && user.organizations) {
        // Send final welcome email
        await EmailService.sendWelcomeEmail(
          user.email,
          user.name || 'User',
          user.organizations.name
        );
      }

      logger.info('Onboarding completed', {
        organizationId,
        skipOptionalSteps,
        completedAt: new Date()
      });

      return {
        success: true,
        message: 'Welcome to Tightship PMS! Your account is ready to use.'
      };

    } catch (error) {
      logger.error('Failed to complete onboarding', {
        organizationId,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to complete onboarding. Please try again.'
      };
    }
  }

  /**
   * Get onboarding progress for user
   */
  static async getOnboardingProgress(userId: string): Promise<{
    completed: boolean;
    currentStep: string;
    steps: OnboardingStep[];
    organization?: any;
    restaurant?: any;
  }> {
    try {
      const user = await db.users.findUnique({
        where: { id: userId },
        include: {
          organizations: {
            include: {
              restaurants: {
                take: 1,
                include: {
                  menus: {
                    take: 1,
                    include: {
                      products: {
                        take: 5
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const organization = user.organizations;
      const restaurant = organization?.restaurants?.[0];
      const menu = restaurant?.menus?.[0];
      const hasProducts = menu?.products && menu.products.length > 0;

      const steps: OnboardingStep[] = [
        {
          id: 'create_account',
          title: 'Create Account',
          description: 'Set up your user account',
          completed: true, // User exists, so this is complete
          required: true,
          order: 1
        },
        {
          id: 'verify_email',
          title: 'Verify Email',
          description: 'Confirm your email address',
          completed: !!user.emailVerified,
          required: true,
          order: 2
        },
        {
          id: 'create_organization',
          title: 'Create Organization',
          description: 'Set up your business organization',
          completed: !!organization,
          required: true,
          order: 3
        },
        {
          id: 'create_restaurant',
          title: 'Add First Restaurant',
          description: 'Add your first restaurant location',
          completed: !!restaurant,
          required: true,
          order: 4
        },
        {
          id: 'setup_products',
          title: 'Add Products',
          description: 'Import or create your menu items',
          completed: hasProducts,
          required: false,
          order: 5
        },
        {
          id: 'setup_integrations',
          title: 'Connect Platforms',
          description: 'Connect to delivery platforms',
          completed: false, // Would check integrations table
          required: false,
          order: 6
        }
      ];

      const completedRequiredSteps = steps.filter(s => s.required && s.completed).length;
      const totalRequiredSteps = steps.filter(s => s.required).length;
      const isCompleted = completedRequiredSteps === totalRequiredSteps;

      const currentStep = steps.find(s => !s.completed)?.id || 'completed';

      return {
        completed: isCompleted,
        currentStep,
        steps,
        organization,
        restaurant
      };

    } catch (error) {
      logger.error('Failed to get onboarding progress', {
        userId,
        error: error.message
      });

      // Return default progress on error
      return {
        completed: false,
        currentStep: 'create_organization',
        steps: []
      };
    }
  }

  /**
   * Skip onboarding step (for optional steps)
   */
  static async skipStep(
    organizationId: string,
    stepId: string
  ): Promise<{
    success: boolean;
    nextStep?: string;
    error?: string;
  }> {
    try {
      logger.info('Onboarding step skipped', {
        organizationId,
        stepId,
        timestamp: new Date()
      });

      // Determine next step based on current step
      const nextStepMap: Record<string, string> = {
        'setup_products': 'setup_integrations',
        'setup_integrations': 'completed'
      };

      const nextStep = nextStepMap[stepId] || 'completed';

      return {
        success: true,
        nextStep
      };

    } catch (error) {
      logger.error('Failed to skip onboarding step', {
        organizationId,
        stepId,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to skip step. Please try again.'
      };
    }
  }
}