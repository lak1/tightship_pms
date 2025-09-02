import { db } from '@/lib/db';
import { LOYVERSE_CONFIG } from './config';
import type { LoyverseTokenResponse, LoyverseError } from './types';

interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

class LoyverseAPIClient {
  private rateLimitState: RateLimitState = {
    requestCount: 0,
    windowStart: Date.now(),
  };
  
  constructor(
    private accessToken: string,
    private refreshToken: string,
    private restaurantId: string
  ) {}
  
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 60000; // 1 minute in milliseconds
    
    if (now - this.rateLimitState.windowStart >= windowDuration) {
      this.rateLimitState = {
        requestCount: 0,
        windowStart: now,
      };
    }
    
    if (this.rateLimitState.requestCount >= LOYVERSE_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE) {
      const waitTime = windowDuration - (now - this.rateLimitState.windowStart);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimitState = {
        requestCount: 0,
        windowStart: Date.now(),
      };
    }
    
    this.rateLimitState.requestCount++;
  }
  
  private async refreshAccessToken(): Promise<string> {
    try {
      const response = await fetch(LOYVERSE_CONFIG.OAUTH_ENDPOINTS.TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: LOYVERSE_CONFIG.CLIENT_ID,
          client_secret: LOYVERSE_CONFIG.CLIENT_SECRET,
          refresh_token: this.refreshToken,
        }),
      });
      
      if (!response.ok) {
        const error: LoyverseError = await response.json();
        throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
      }
      
      const tokens: LoyverseTokenResponse = await response.json();
      
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      
      await db.integrations.update({
        where: {
          restaurantId_platformId: {
            restaurantId: this.restaurantId,
            platformId: 'loyverse',
          },
        },
        data: {
          credentials: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: expiresAt.toISOString(),
            scopes: tokens.scope,
          },
          updatedAt: new Date(),
        },
      });
      
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      
      return tokens.access_token;
    } catch (error) {
      console.error('Failed to refresh Loyverse token:', error);
      throw error;
    }
  }
  
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.checkRateLimit();
    
    const url = `${LOYVERSE_CONFIG.API_BASE_URL}/${LOYVERSE_CONFIG.API_VERSION}${endpoint}`;
    
    let retries = 0;
    const maxRetries = LOYVERSE_CONFIG.RATE_LIMIT.MAX_RETRIES;
    
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
          if (retries === 0) {
            this.accessToken = await this.refreshAccessToken();
            retries++;
            continue;
          } else {
            throw new Error('Authentication failed after token refresh');
          }
        }
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : LOYVERSE_CONFIG.RATE_LIMIT.RETRY_AFTER_MS * Math.pow(2, retries);
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
          continue;
        }
        
        if (!response.ok) {
          const error: LoyverseError = await response.json();
          throw new Error(`API request failed: ${error.error_description || error.error}`);
        }
        
        return await response.json();
      } catch (error) {
        if (retries === maxRetries) {
          throw error;
        }
        retries++;
        await new Promise(resolve => 
          setTimeout(resolve, LOYVERSE_CONFIG.RATE_LIMIT.RETRY_AFTER_MS * Math.pow(2, retries))
        );
      }
    }
    
    throw new Error('Max retries exceeded');
  }
  
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
  
  async paginate<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T[]> {
    const results: T[] = [];
    let cursor: string | null = null;
    
    do {
      const queryParams = new URLSearchParams({
        ...params,
        limit: '250',
        ...(cursor && { cursor }),
      });
      
      const response: any = await this.get(`${endpoint}?${queryParams}`);
      
      if (response.items) {
        results.push(...response.items);
      } else if (Array.isArray(response)) {
        results.push(...response);
      } else {
        results.push(response);
      }
      
      cursor = response.cursor || null;
    } while (cursor);
    
    return results;
  }
}

export async function createLoyverseClient(restaurantId: string): Promise<LoyverseAPIClient | null> {
  try {
    const integration = await db.integrations.findUnique({
      where: {
        restaurantId_platformId: {
          restaurantId,
          platformId: 'loyverse',
        },
      },
    });
    
    if (!integration || integration.status !== 'CONNECTED') {
      return null;
    }
    
    const credentials = integration.credentials as any;
    
    if (!credentials?.accessToken || !credentials?.refreshToken) {
      return null;
    }
    
    return new LoyverseAPIClient(
      credentials.accessToken,
      credentials.refreshToken,
      restaurantId
    );
  } catch (error) {
    console.error('Failed to create Loyverse client:', error);
    return null;
  }
}

export { LoyverseAPIClient };