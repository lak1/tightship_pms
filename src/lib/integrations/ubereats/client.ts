import { db } from '@/lib/db';
import { UBEREATS_CONFIG } from './config';
import type { UberEatsTokenResponse, UberEatsError } from './types';
import { SignJWT, importPKCS8 } from 'jose';
import { randomUUID } from 'crypto';

interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

/**
 * Uber Eats API Client
 *
 * Supports two authentication methods:
 * 1. Client Secret (OAuth 2.0 client credentials)
 * 2. Asymmetric Keys (JWT-based authentication with RSA)
 *
 * Documentation: https://developer.uber.com/docs/eats
 * Asymmetric Auth: https://developer.uber.com/docs/consumer-identity/api/asymmetric_key_auth
 */
class UberEatsAPIClient {
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
   * Generate JWT assertion for asymmetric key authentication
   * Uses RS256 signing with private key
   */
  private async generateJWTAssertion(keyId: string): Promise<string> {
    try {
      // Parse private key from PEM format
      const privateKey = await importPKCS8(
        UBEREATS_CONFIG.PRIVATE_KEY,
        'RS256'
      );

      // Generate JWT with required claims
      const jwt = await new SignJWT({
        iss: UBEREATS_CONFIG.CLIENT_ID, // Issuer: your client ID
        sub: UBEREATS_CONFIG.CLIENT_ID, // Subject: must match iss
        aud: 'auth.uber.com', // Audience: Uber auth server
        jti: randomUUID(), // JWT ID: must be unique for each request
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
      })
        .setProtectedHeader({
          alg: 'RS256',
          typ: 'JWT',
          kid: keyId, // Key ID from your Uber key file
        })
        .sign(privateKey);

      return jwt;
    } catch (error) {
      console.error('Failed to generate JWT assertion:', error);
      throw new Error(`JWT generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check and enforce rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 1000; // 1 second

    if (now - this.rateLimitState.windowStart >= windowDuration) {
      this.rateLimitState = {
        requestCount: 0,
        windowStart: now,
      };
    }

    if (this.rateLimitState.requestCount >= UBEREATS_CONFIG.RATE_LIMIT.REQUESTS_PER_SECOND) {
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
   * Get a new access token using either client secret or asymmetric key
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      const tokenUrl = UBEREATS_CONFIG.AUTH_ENDPOINTS.TOKEN;

      // Build request body based on authentication method
      const bodyParams: Record<string, string> = {
        grant_type: 'client_credentials',
        scope: UBEREATS_CONFIG.SCOPES.CLIENT_CREDENTIALS.join(' '),
      };

      if (UBEREATS_CONFIG.USE_ASYMMETRIC_AUTH && UBEREATS_CONFIG.PRIVATE_KEY) {
        // Asymmetric key authentication (JWT-based)
        // Extract key ID from integration settings
        const integration = await db.integrations.findUnique({
          where: {
            restaurantId_platformId: {
              restaurantId: this.restaurantId,
              platformId: 'ubereats',
            },
          },
        });

        const settings = integration?.settings as { keyId?: string } | undefined;
        const keyId = settings?.keyId || 'default';

        const clientAssertion = await this.generateJWTAssertion(keyId);
        bodyParams.client_assertion = clientAssertion;
        bodyParams.client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
      } else {
        // Traditional client secret authentication
        bodyParams.client_id = UBEREATS_CONFIG.CLIENT_ID;
        bodyParams.client_secret = UBEREATS_CONFIG.CLIENT_SECRET;
      }

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(bodyParams),
      });

      if (!response.ok) {
        const error: UberEatsError = await response.json();
        throw new Error(`Token request failed: ${error.message}`);
      }

      const tokens: UberEatsTokenResponse = await response.json();

      // Calculate expiration time (tokens valid for 30 days)
      const expiresAt = Date.now() + (tokens.expires_in * 1000);

      // Update integration in database
      await db.integrations.update({
        where: {
          restaurantId_platformId: {
            restaurantId: this.restaurantId,
            platformId: 'ubereats',
          },
        },
        data: {
          credentials: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
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
      console.error('Failed to refresh Uber Eats token:', error);
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

    // Check if token needs refresh (refresh 1 day before expiry)
    if (Date.now() >= this.tokenExpiresAt - UBEREATS_CONFIG.TOKEN_CONFIG.REFRESH_BUFFER_SECONDS * 1000) {
      await this.refreshAccessToken();
    }

    const url = `${UBEREATS_CONFIG.API_BASE_URL}${endpoint}`;

    let retries = 0;
    const maxRetries = UBEREATS_CONFIG.RATE_LIMIT.MAX_RETRIES;

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
            : UBEREATS_CONFIG.RATE_LIMIT.RETRY_AFTER_MS * Math.pow(2, retries);

          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
          continue;
        }

        if (!response.ok) {
          const error: UberEatsError = await response.json();
          throw new Error(`API request failed: ${error.message}`);
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
          setTimeout(resolve, UBEREATS_CONFIG.RATE_LIMIT.RETRY_AFTER_MS * Math.pow(2, retries))
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
   * PATCH request
   */
  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
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
 * Create an Uber Eats API client for a restaurant
 * Handles token refresh automatically
 */
export async function createUberEatsClient(restaurantId: string): Promise<UberEatsAPIClient | null> {
  try {
    const integration = await db.integrations.findUnique({
      where: {
        restaurantId_platformId: {
          restaurantId,
          platformId: 'ubereats',
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

    if (!accessToken || Date.now() >= expiresAt - UBEREATS_CONFIG.TOKEN_CONFIG.REFRESH_BUFFER_SECONDS * 1000) {
      // Get new token
      const bodyParams: Record<string, string> = {
        grant_type: 'client_credentials',
        scope: UBEREATS_CONFIG.SCOPES.CLIENT_CREDENTIALS.join(' '),
      };

      if (UBEREATS_CONFIG.USE_ASYMMETRIC_AUTH && UBEREATS_CONFIG.PRIVATE_KEY) {
        // Asymmetric key authentication
        const settings = integration.settings as { keyId?: string };
        const keyId = settings.keyId || 'default';

        const privateKey = await importPKCS8(UBEREATS_CONFIG.PRIVATE_KEY, 'RS256');
        const jwt = await new SignJWT({
          iss: UBEREATS_CONFIG.CLIENT_ID,
          sub: UBEREATS_CONFIG.CLIENT_ID,
          aud: 'auth.uber.com',
          jti: randomUUID(),
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
          .setProtectedHeader({
            alg: 'RS256',
            typ: 'JWT',
            kid: keyId,
          })
          .sign(privateKey);

        bodyParams.client_assertion = jwt;
        bodyParams.client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
      } else {
        // Client secret authentication
        bodyParams.client_id = UBEREATS_CONFIG.CLIENT_ID;
        bodyParams.client_secret = UBEREATS_CONFIG.CLIENT_SECRET;
      }

      const response = await fetch(UBEREATS_CONFIG.AUTH_ENDPOINTS.TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(bodyParams),
      });

      if (!response.ok) {
        const error: UberEatsError = await response.json();
        throw new Error(`Token request failed: ${error.message}`);
      }

      const tokens: UberEatsTokenResponse = await response.json();
      accessToken = tokens.access_token;
      expiresAt = Date.now() + (tokens.expires_in * 1000);

      // Update integration
      await db.integrations.update({
        where: {
          restaurantId_platformId: {
            restaurantId,
            platformId: 'ubereats',
          },
        },
        data: {
          credentials: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(expiresAt).toISOString(),
            tokenType: tokens.token_type,
            scope: tokens.scope,
          },
          updatedAt: new Date(),
        },
      });
    }

    return new UberEatsAPIClient(
      accessToken,
      expiresAt,
      restaurantId
    );
  } catch (error) {
    console.error('Failed to create Uber Eats client:', error);
    return null;
  }
}

export { UberEatsAPIClient };
