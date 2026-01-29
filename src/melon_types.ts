/**
 * Type definitions for Melon Face Recognition API
 */

export interface MelonApiConfig {
  apiEndpoint: string;
  keyId: string;
  secretKey: string;
  subject?: string;
}

export interface JWTHeader {
  alg: string;
  kid: string;
  typ: string;
}

export interface JWTPayload {
  aud: string[];
  sub: string;
  iat: number;
  exp: number;
}

export interface CreateUserRequest {
  display_name: string;
}

export interface User {
  uuid: string;
  display_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserResponse {
  uuid: string;
  display_name: string;
}

export interface CreateTokenRequest {
  valid_from: number;
  valid_through: number;
  metadata?: {
    gallery?: string;
    [key: string]: any;
  };
}

export interface Token {
  uuid: string;
  valid_from: number;
  valid_through: number;
  metadata?: {
    gallery?: string;
    [key: string]: any;
  };
}

export interface CreateTokenResponse {
  uuid: string;
  valid_from: number;
  valid_through: number;
  metadata?: {
    gallery?: string;
    [key: string]: any;
  };
}

export interface CreateDeviceRequest {
  display_name: string;
  metadata?: {
    gallery?: string;
    [key: string]: any;
  };
}

export interface Device {
  uuid: string;
  display_name: string;
  metadata?: {
    gallery?: string;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export interface CreateDeviceResponse {
  uuid: string;
  display_name: string;
  metadata?: {
    gallery?: string;
    [key: string]: any;
  };
}

export interface DeviceKey {
  uuid: string;
  key: string;
  created_at?: string;
}

export interface CreateDeviceKeyResponse {
  uuid: string;
  key: string;
}

export interface MatchResult {
  uuid: string;
  score: number;
}

export interface MatchResponse {
  users: MatchResult[];
}

export interface MelonApiError {
  error: string;
  message?: string;
  status?: number;
}
