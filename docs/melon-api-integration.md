# Melon Face Recognition API Integration

This guide explains how to use the Melon Face Recognition API integration with the get-face-status library.

## Overview

The integration combines two powerful capabilities:

1. **Face Quality Checking** (get-face-status): Ensures captured faces are properly positioned and sized
2. **Face Recognition** (Melon API): Registers and authenticates users based on facial features

## Architecture

```
User Capture → Face Quality Check → Registration/Authentication
                (get-face-status)      (Melon API)
```

## API Workflow

### Registration Flow

1. **Create User**: Register a new user with a display name
2. **Capture Face**: Use camera to capture face image (with quality check)
3. **Upload Face**: Send face image to Melon API for registration
4. **Create Token**: Generate authentication token with gallery metadata

### Authentication Flow

1. **Register Device**: One-time device registration (per browser/device)
2. **Generate Device Key**: Obtain device-specific credentials
3. **Capture Face**: Use camera to capture face for comparison
4. **Match Face**: Compare against registered users in the same gallery
5. **Verify Score**: Check if match score exceeds threshold (default: 0.5)

## Setup

### Installation

```bash
npm install @melon-technologies/get-face-status
```

### Configuration

```javascript
import { MelonApiClient } from "@melon-technologies/get-face-status";

const melonClient = new MelonApiClient({
  apiEndpoint: "https://api-beta.melon.co.jp/v2",
  keyId: "your-key-id",
  secretKey: "your-secret-key",
  subject: "teacher", // Optional, defaults to "teacher"
});
```

## Usage Examples

### Creating a User

```javascript
const userResponse = await melonClient.createUser("John Doe");
console.log("User UUID:", userResponse.uuid);
```

### Registering a Face

```javascript
// Capture image from video/canvas
const imageBlob = await captureImage(video, canvas);

// Upload face
await melonClient.registerFace(userUuid, imageBlob);
```

### Creating User Token

```javascript
const now = Math.floor(Date.now() / 1000);
const tokenResponse = await melonClient.createUserToken(
  userUuid,
  now, // valid_from
  now + 365 * 24 * 60 * 60, // valid_through (1 year)
  { gallery: "office-team" } // metadata
);
```

### Registering a Device

```javascript
const deviceResponse = await melonClient.createDevice("device-001", {
  gallery: "office-team",
});

const keyResponse = await melonClient.createDeviceKey(deviceResponse.uuid);

// Store these for future authentication
const deviceInfo = {
  uuid: deviceResponse.uuid,
  keyId: keyResponse.uuid,
  secretKey: keyResponse.key,
};
```

### Authenticating a Face

```javascript
// Capture image
const imageBlob = await captureImage(video, canvas);

// Match face
const matchResponse = await melonClient.matchFace(
  imageBlob,
  deviceInfo.keyId,
  deviceInfo.secretKey
);

if (matchResponse.users && matchResponse.users.length > 0) {
  const bestMatch = matchResponse.users[0];
  console.log("User UUID:", bestMatch.uuid);
  console.log("Match Score:", bestMatch.score);

  if (bestMatch.score >= 0.5) {
    console.log("Authentication successful!");
  }
}
```

### Combined with Face Quality Check

```javascript
import { getFaceStatus, FaceStatus } from "@melon-technologies/get-face-status";

// Detect faces using TensorFlow/MediaPipe
const faces = await detector.estimateFaces(video);

// Check face quality
const { status, face } = getFaceStatus(
  faces,
  { width: video.videoWidth, height: video.videoHeight },
  { detectorType: "mediapipe" }
);

// Only proceed if face quality is OK
if (status === FaceStatus.OK) {
  const imageBlob = await captureImage(video, canvas);
  await melonClient.registerFace(userUuid, imageBlob);
}
```

## API Reference

### MelonApiClient

#### Constructor

```typescript
new MelonApiClient(config: MelonApiConfig)
```

**Parameters:**
- `apiEndpoint`: Base URL of the Melon API
- `keyId`: API key ID for authentication
- `secretKey`: Base64URL-encoded secret key
- `subject`: JWT subject (optional, default: "teacher")

#### Methods

##### `createUser(displayName: string): Promise<CreateUserResponse>`

Creates a new user.

##### `getUser(userUuid: string): Promise<any>`

Retrieves user information.

##### `createUserToken(userUuid, validFrom, validThrough, metadata?): Promise<CreateTokenResponse>`

Creates an authentication token for a user.

##### `registerFace(userUuid: string, imageBlob: Blob): Promise<void>`

Uploads a face image for a user.

##### `createDevice(displayName: string, metadata?): Promise<CreateDeviceResponse>`

Registers a new device.

##### `getDevice(deviceUuid: string): Promise<any>`

Retrieves device information.

##### `createDeviceKey(deviceUuid: string): Promise<CreateDeviceKeyResponse>`

Generates a key for device-based authentication.

##### `matchFace(imageBlob: Blob, deviceKeyId: string, deviceSecretKey: string): Promise<MatchResponse>`

Matches a face against registered users.

## Gallery System

The gallery system allows you to organize users into groups. Only users in the same gallery as the device can be matched during authentication.

**Example:**
```javascript
// Register user in "office-team" gallery
await melonClient.createUserToken(userUuid, validFrom, validThrough, {
  gallery: "office-team",
});

// Register device in "office-team" gallery
await melonClient.createDevice("device-001", {
  gallery: "office-team",
});

// Authentication will only match users in "office-team"
```

## Error Handling

```javascript
try {
  const userResponse = await melonClient.createUser("John Doe");
} catch (error) {
  console.error("Error:", error.error);
  console.error("Message:", error.message);
  console.error("Status:", error.status);
}
```

## Best Practices

1. **Face Quality**: Always use `getFaceStatus()` to ensure face quality before registration/authentication
2. **Gallery Organization**: Use meaningful gallery names to organize users by department, location, etc.
3. **Token Expiration**: Set appropriate expiration times for user tokens
4. **Device Storage**: Store device credentials securely (e.g., localStorage with encryption)
5. **Match Threshold**: Adjust the match score threshold (0.5) based on your security requirements
6. **Error Handling**: Implement proper error handling for network failures and API errors
7. **CORS**: If running in browser, ensure your API endpoint supports CORS or use a backend proxy

## Demo Application

A complete demo application is available in `examples/face-comparison/`:

```bash
cd examples/face-comparison
# Open index.html in a browser (requires HTTPS or localhost)
```

The demo includes:
- Face registration with quality checking
- Device registration
- Face authentication
- Real-time face detection overlay
- Match score visualization

## Troubleshooting

### CORS Issues

If you encounter CORS errors, you have two options:

1. **Backend Proxy**: Create a backend service that proxies requests to the Melon API
2. **Server Environment**: Use the API from a Node.js server instead of the browser

### Camera Access

- Requires HTTPS (or localhost for development)
- User must grant camera permissions
- Some browsers may block camera access in iframes

### Face Detection

- Ensure good lighting conditions
- Face should be clearly visible and centered
- Remove glasses or masks if possible for better accuracy

## Security Considerations

1. **API Credentials**: Never expose API credentials in public repositories
2. **HTTPS**: Always use HTTPS in production
3. **Token Management**: Implement proper token refresh mechanisms
4. **Rate Limiting**: Be aware of API rate limits
5. **Data Privacy**: Comply with privacy regulations (GDPR, etc.) when storing biometric data

## Support

For issues or questions:
- Melon API Documentation: [Contact Melon Technologies]
- get-face-status: https://github.com/Melon-Technologies/get-face-status
