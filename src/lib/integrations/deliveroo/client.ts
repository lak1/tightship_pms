import { db } from '@/lib/db';
import { DELIVEROO_CONFIG } from './config';
import type { DeliverooTokenResponse, DeliverooError } from './types';

interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

/**
 * Deliveroo API Client
 *
 * Uses OAuth 2.0 Client Credentials flow (machine-to-machine)
 * Tokens expire after 300 seconds (5 minutes)
 *
 * Documentation: https://api-docs.deliveroo.com/docs/authentication
 */
class DeliverooAPIClient {
  private accessToken: string;
  private tokenExpiresAt: number;
  private restaurantId: string;

  private rateLimitState: RateLimitState = {
    requestCount: 0,
    windowStart: Date.now(),
  };

  constructor(
    accessToken: string,
    tokenExpiresAt: number,
    restaurantId: string
  ) {
    this.accessToken = accessToken;
    this.tokenExpiresAt = tokenExpiresAt;
    this.restaurantId = restaurantId;
  }

  /**
   * Check and enforce rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 60000; // 1 minute

    if (now - this.rateLimitState.windowStart >= windowDuration) {
      this.rateLimitState = {
        requestCount: 0,
        windowStart: now,
      };
    }

    if (this.rateLimitState.requestCount >= DELIVEROO_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE) {
      const waitTime = windowDuration - (now - this.rateLimitState.windowStart);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimitState = {
        requestCount: 0,
        windowStart: Date.now(),
      };
    }

    this.rateLimitState.requestCount++;
  }

  /**
   * Get a new access token using client credentials
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      const tokenUrl = `${DELIVEROO_CONFIG.AUTH_HOST}${DELIVEROO_CONFIG.OAUTH_ENDPOINTS.TOKEN}`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: DELIVEROO_CONFIG.CLIENT_ID,
          client_secret: DELIVEROO_CONFIG.CLIENT_SECRET,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        const error: DeliverooError = await response.json();
        throw new Error(`Token request failed: ${error.error_description || error.error}`);
      }

      const tokens: DeliverooTokenResponse = await response.json();

      // Calculate expiration time (tokens expire in 300 seconds)
      const expiresAt = Date.now() + (tokens.expires_in * 1000);

      // Update integration in database
      await db.integrations.update({
        where: {
          restaurantId_platformId: {
            restaurantId: this.restaurantId,
            platformId: 'deliveroo',
          },
        },
        data: {
          credentials: {
            accessToken: tokens.access_token,
            expiresAt: new Date(expiresAt).toISOString(),
            tokenType: tokens.token_type,
            scope: tokens.scope,
          },
          updatedAt: new Date(),
        },
      });

      this.accessToken = tokens.access_token;
      this.tokenExpiresAt = expiresAt;

      return tokens.access_token;
    } catch (error) {
      console.error('Failed to refresh Deliveroo token:', error);
      throw error;
    }
  }

  /**
   * Make an API request with automatic token refresh
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.checkRateLimit();

    // Check if token needs refresh (refresh 60 seconds before expiry)
    if (Date.now() >= this.tokenExpiresAt - 60000) {
      await this.refreshAccessToken();
    }

    const url = `${DELIVEROO_CONFIG.API_BASE_URL}${endpoint}`;

    let retries = 0;
    const maxRetries = DELIVEROO_CONFIG.RATE_LIMIT.MAX_RETRIES;

    while (retries <= maxRetries) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (response.status === 401) {
          // Token expired, refresh and retry
          if (retries === 0) {
            await this.refreshAccessToken();
            retries++;
            continue;
          } else {
            throw new Error('Authentication failed after token refresh');
          }
        }

        if (response.status === 429) {
          // Rate limited
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter
            ? parseInt(retryAfter) * 1000
            : DELIVEROO_CONFIG.RATE_LIMIT.RETRY_AFTER_MS * Math.pow(2, retries);

          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
          continue;
        }

        if (!response.ok) {
          const error: DeliverooError = await response.json();
          throw new Error(`API request failed: ${error.error_description || error.error}`);
        }

        // Handle empty responses (204 No Content)
        if (response.status === 204) {
          return {} as T;
        }

        return await response.json();
      } catch (error) {
        if (retries === maxRetries) {
          throw error;
        }
        retries++;
        await new Promise(resolve =>
          setTimeout(resolve, DELIVEROO_CONFIG.RATE_LIMIT.RETRY_AFTER_MS * Math.pow(2, retries))
        );
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Create a Deliveroo API client for a restaurant
 * Handles token refresh automatically
 */
export async function createDeliverooClient(restaurantId: string): Promise<DeliverooAPIClient | null> {
  try {
    const integration = await db.integrations.findUnique({
      where: {
        restaurantId_platformId: {
          restaurantId,
          platformId: 'deliveroo',
        },
      },
    });

    if (!integration || integration.status !== 'CONNECTED') {
      return null;
    }

    const credentials = integration.credentials as {
      accessToken?: string;
      expiresAt?: string;
    };

    // If no token or expired, get a new one
    let accessToken = credentials?.accessToken;
    let expiresAt = credentials?.expiresAt ? new Date(credentials.expiresAt).getTime() : 0;

    if (!accessToken || Date.now() >= expiresAt - 60000) {
      // Get new token using client credentials
      const tokenUrl = `${DELIVEROO_CONFIG.AUTH_HOST}${DELIVEROO_CONFIG.OAUTH_ENDPOINTS.TOKEN}`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: DELIVEROO_CONFIG.CLIENT_ID,
          client_secret: DELIVEROO_CONFIG.CLIENT_SECRET,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        const error: DeliverooError = await response.json();
        throw new Error(`Token request failed: ${error.error_description || error.error}`);
      }

      const tokens: DeliverooTokenResponse = await response.json();
      accessToken = tokens.access_token;
      expiresAt = Date.now() + (tokens.expires_in * 1000);

      // Update integration
      await db.integrations.update({
        where: {
          restaurantId_platformId: {
            restaurantId,
            platformId: 'deliveroo',
          },
        },
        data: {
          credentials: {
            accessToken: tokens.access_token,
            expiresAt: new Date(expiresAt).toISOString(),
            tokenType: tokens.token_type,
            scope: tokens.scope,
          },
          updatedAt: new Date(),
        },
      });
    }

    return new DeliverooAPIClient(
      accessToken,
      expiresAt,
      restaurantId
    );
  } catch (error) {
    console.error('Failed to create Deliveroo client:', error);
    return null;
  }
}

export { DeliverooAPIClient };
