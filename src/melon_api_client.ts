import {
  MelonApiConfig,
  CreateUserRequest,
  CreateUserResponse,
  CreateTokenRequest,
  CreateTokenResponse,
  CreateDeviceRequest,
  CreateDeviceResponse,
  CreateDeviceKeyResponse,
  MatchResponse,
  MelonApiError,
} from "./melon_types";

/**
 * Melon Face Recognition API Client
 *
 * This client provides methods to interact with the Melon Face Recognition API
 * for user management, face registration, device management, and face matching.
 */
export class MelonApiClient {
  private config: MelonApiConfig;

  constructor(config: MelonApiConfig) {
    this.config = {
      subject: "teacher",
      ...config,
    };
  }

  /**
   * Generate JWT token for API authentication
   */
  private async generateJWT(keyId?: string, secretKey?: string): Promise<string> {
    const kid = keyId || this.config.keyId;
    const secret = secretKey || this.config.secretKey;

    const header = {
      alg: "HS256",
      kid: kid,
      typ: "JWT",
    };

    const now = Math.floor(Date.now() / 1000);
    // Parse hostname for audience (document requires hostname only, no path)
    let audience: string;
    try {
      const url = new URL(this.config.apiEndpoint);
      audience = url.host;
    } catch {
      // Fallback if URL parsing fails
      audience = this.config.apiEndpoint.replace(/^https?:\/\//, "").split("/")[0];
    }

    const payload = {
      aud: [audience],
      sub: this.config.subject,
      iat: now - 30, // 30 seconds back for clock skew
      exp: now + 3600, // 1 hour expiration
    };

    // Encode header and payload
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    // Create signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = await this.hmacSHA256(signatureInput, secret);

    return `${signatureInput}.${signature}`;
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(str: string): string {
    const base64 = btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  /**
   * Base64 URL decode
   */
  private base64UrlDecode(str: string): string {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = str.length % 4;
    if (pad) {
      str += "=".repeat(4 - pad);
    }
    return atob(str);
  }

  /**
   * HMAC SHA256 signature
   */
  private async hmacSHA256(message: string, secret: string): Promise<string> {
    // Decode base64url secret
    const secretDecoded = this.base64UrlDecode(secret);
    const secretBytes = new Uint8Array(
      secretDecoded.split("").map((c) => c.charCodeAt(0))
    );

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageBytes);

    // Convert to base64url
    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
    return signatureBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  /**
   * Make API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    token: string,
    body?: any,
    contentType?: string
  ): Promise<T> {
    const url = `${this.config.apiEndpoint}${endpoint}`;
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    };

    if (contentType) {
      headers["Content-Type"] = contentType;
    } else if (body && !(body instanceof Blob)) {
      headers["Content-Type"] = "application/json";
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      if (body instanceof Blob) {
        options.body = body;
      } else {
        options.body = JSON.stringify(body);
      }
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: MelonApiError;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {
            error: `HTTP ${response.status}`,
            message: errorText || response.statusText,
            status: response.status,
          };
        }
        throw errorData;
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      if ((error as MelonApiError).error) {
        throw error;
      }
      throw {
        error: "NetworkError",
        message: (error as Error).message,
      } as MelonApiError;
    }
  }

  /**
   * Create a new user
   */
  async createUser(displayName: string): Promise<CreateUserResponse> {
    const token = await this.generateJWT();
    const body: CreateUserRequest = {
      display_name: displayName,
    };
    return this.request<CreateUserResponse>("POST", "/users", token, body);
  }

  /**
   * Get user information
   */
  async getUser(userUuid: string): Promise<any> {
    const token = await this.generateJWT();
    return this.request("GET", `/users/${userUuid}`, token);
  }

  /**
   * Create a token for a user
   */
  async createUserToken(
    userUuid: string,
    validFrom: number,
    validThrough: number,
    metadata?: { gallery?: string; [key: string]: any }
  ): Promise<CreateTokenResponse> {
    const token = await this.generateJWT();
    const body: CreateTokenRequest = {
      valid_from: validFrom,
      valid_through: validThrough,
      metadata,
    };
    return this.request<CreateTokenResponse>(
      "POST",
      `/users/${userUuid}/tokens`,
      token,
      body
    );
  }

  /**
   * Register a face for a user
   */
  async registerFace(userUuid: string, imageBlob: Blob): Promise<void> {
    const token = await this.generateJWT();
    await this.request<void>(
      "PUT",
      `/users/${userUuid}/face`,
      token,
      imageBlob,
      "image/jpeg"
    );
  }

  /**
   * Create a new device
   */
  async createDevice(
    displayName: string,
    metadata?: { gallery?: string; [key: string]: any }
  ): Promise<CreateDeviceResponse> {
    const token = await this.generateJWT();
    const body: CreateDeviceRequest = {
      display_name: displayName,
      metadata,
    };
    return this.request<CreateDeviceResponse>("POST", "/devices", token, body);
  }

  /**
   * Get device information
   */
  async getDevice(deviceUuid: string): Promise<any> {
    const token = await this.generateJWT();
    return this.request("GET", `/devices/${deviceUuid}`, token);
  }

  /**
   * Create a key for a device
   */
  async createDeviceKey(deviceUuid: string): Promise<CreateDeviceKeyResponse> {
    const token = await this.generateJWT();
    return this.request<CreateDeviceKeyResponse>(
      "POST",
      `/devices/${deviceUuid}/keys`,
      token
    );
  }

  /**
   * Match a face against registered users
   * Uses device-specific JWT token
   */
  async matchFace(
    imageBlob: Blob,
    deviceKeyId: string,
    deviceSecretKey: string
  ): Promise<MatchResponse> {
    const token = await this.generateJWT(deviceKeyId, deviceSecretKey);
    return this.request<MatchResponse>(
      "POST",
      "/match",
      token,
      imageBlob,
      "image/jpeg"
    );
  }
}

/**
 * Export types for convenience
 */
export * from "./melon_types";
