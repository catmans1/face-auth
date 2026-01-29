# Face Comparison Demo - Quick Start

This demo showcases the integration of Melon Face Recognition API with the get-face-status library.

## Features

✨ **Face Registration**
- Real-time face quality checking
- User creation via Melon API
- Face image upload and registration
- Token generation with gallery support

🔐 **Face Authentication**
- Device registration (one-time setup)
- Face matching against registered users
- Match score visualization
- Gallery-based user filtering

## Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Webcam access
- HTTPS or localhost (required for camera access)

## Running the Demo

### Option 1: Using the provided script

```bash
./start-demo.sh
```

Then open: http://localhost:8000/examples/face-comparison/

### Option 2: Using npx

```bash
npx http-server -p 8000
```

Then open: http://localhost:8000/examples/face-comparison/

### Option 3: Using Python directly

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open: http://localhost:8000/examples/face-comparison/

## How to Use

### Registration Flow

1. **Allow Camera Access**: Grant permission when prompted
2. **Enter Display Name**: Type your name in the input field
3. **Optional Gallery**: Enter a gallery name (e.g., "office-team") or leave blank for default
4. **Position Your Face**: Follow the on-screen guidance until status shows "OK"
   - Move closer/farther to adjust size
   - Center your face in the frame
   - Ensure good lighting
5. **Click "Register Face"**: Wait for the registration to complete
6. **Save User UUID**: Copy the UUID from the result for reference

### Authentication Flow

1. **Register Device** (First time only):
   - Click "Register Device" button
   - Wait for device registration to complete
   - Device credentials are saved in browser localStorage
2. **Position Your Face**: Follow the same guidance as registration
3. **Click "Authenticate"**: Wait for face matching
4. **View Results**:
   - Match score will be displayed
   - Scores ≥ 0.5 indicate successful authentication
   - User UUID of matched person will be shown

## Gallery System

The gallery system allows you to organize users into groups:

- Users in the same gallery can authenticate on devices in that gallery
- Users in different galleries won't match
- Use galleries to separate departments, locations, or access levels

**Example:**
```
Registration: Gallery = "office-team"
Device: Gallery = "office-team"
✓ Authentication will work

Registration: Gallery = "office-team"
Device: Gallery = "warehouse"
✗ Authentication will fail (different galleries)
```

## Troubleshooting

### Camera Not Working

- Ensure you're using HTTPS or localhost
- Check browser permissions for camera access
- Try refreshing the page
- Check if another application is using the camera

### CORS Errors

The demo uses the beta Melon API which may have CORS restrictions. If you encounter CORS errors:

1. **Use a CORS proxy** (for testing only):
   - Install: `npm install -g local-cors-proxy`
   - Run: `lcp --proxyUrl https://api-beta.melon.co.jp`
   - Update `MELON_CONFIG.apiEndpoint` in `index.js`

2. **Create a backend proxy** (recommended for production):
   - Set up a Node.js/Express server
   - Proxy requests to Melon API
   - Update the demo to use your proxy endpoint

### Face Not Detected

- Ensure good lighting conditions
- Remove glasses or masks if possible
- Face the camera directly
- Move closer to the camera
- Ensure only one face is visible (for registration)

### Registration Failed

- Check console for error messages
- Verify API credentials are correct
- Ensure internet connection is stable
- Try a different display name

### Authentication Failed

- Ensure device is registered first
- Check that gallery names match between user and device
- Verify face is clearly visible
- Try multiple angles if score is close to threshold
- Re-register if face has changed significantly (glasses, beard, etc.)

## API Credentials

The demo uses beta API credentials provided by Melon Technologies. These are for testing purposes only.

**For production use:**
- Obtain your own API credentials
- Store credentials securely (environment variables, secrets manager)
- Never commit credentials to version control
- Implement proper authentication and authorization

## Technical Details

### Face Status Codes

- `OK`: Face is properly positioned and sized
- `NO_FACE`: No face detected
- `MOVE_LEFT/RIGHT/UP/DOWN`: Adjust face position
- `MOVE_IN/OUT`: Adjust distance from camera
- `MULTIPLE_FACES`: More than one face detected

### Match Score

- Range: 0.0 to 1.0
- Threshold: 0.5 (configurable)
- Higher score = better match
- Scores below threshold are rejected

### Data Storage

- Device credentials: Stored in browser localStorage
- User data: Stored on Melon servers
- Face images: Processed and stored by Melon API

## Security Notes

⚠️ **Important Security Considerations:**

1. **API Credentials**: The demo includes API credentials for testing. In production, use environment variables or a backend service.
2. **HTTPS**: Always use HTTPS in production to protect data in transit.
3. **Data Privacy**: Comply with GDPR, CCPA, and other privacy regulations when handling biometric data.
4. **User Consent**: Always obtain explicit user consent before capturing and storing facial data.
5. **Access Control**: Implement proper access control for user management operations.

## Next Steps

- Read the full documentation: `docs/melon-api-integration.md`
- Explore the source code: `examples/face-comparison/index.js`
- Check the API client: `src/melon_api_client.ts`
- Review type definitions: `src/melon_types.ts`

## Support

For issues or questions:
- Melon API: Contact Melon Technologies
- get-face-status: https://github.com/Melon-Technologies/get-face-status

## License

This demo is provided as-is for testing and educational purposes.
