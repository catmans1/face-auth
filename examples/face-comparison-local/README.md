# Local Face Comparison Demo

Upload a reference photo and compare it with your webcam in real-time - no API required!

## Features

📸 **Photo Upload**
- Drag & drop or click to upload
- Supports JPG, PNG, WEBP formats
- Automatic face detection in uploaded photo

🎥 **Real-Time Comparison**
- Live webcam feed
- Continuous face matching
- Visual similarity score
- Color-coded match indicators

🔍 **Face Similarity Algorithm**
- Landmark-based comparison
- Normalized distance calculation
- Adjustable threshold
- Works completely offline

## How It Works

1. **Upload Reference Photo**: Click or drag a photo with a clear face
2. **Face Detection**: System detects and analyzes facial landmarks
3. **Live Comparison**: Webcam continuously compares your face with the reference
4. **Match Results**: See real-time similarity scores and match status

## Running the Demo

### Start the Server

From the project root:

```bash
./start-demo.sh
```

Or manually:

```bash
python3 -m http.server 8000
```

### Open in Browser

Navigate to: **http://localhost:8000/examples/face-comparison-local/**

## Usage Guide

### Step 1: Upload Reference Photo

1. Click the upload area or drag & drop an image
2. Wait for face detection (should be instant)
3. Green status = face detected successfully
4. You'll see the face outlined in purple

### Step 2: Position Yourself

1. Look at your webcam
2. Position your face in the frame
3. The system will continuously compare

### Step 3: View Results

- **Green box + "MATCH!"** = You match the reference photo (≥40% similarity)
- **Red box + "No Match"** = Different person (<40% similarity)
- **Similarity percentage** shown in real-time
- **Confidence bar** visualizes the match strength

## Similarity Threshold

The default threshold is **40%** (0.4). You can adjust this in `index.js`:

```javascript
const SIMILARITY_THRESHOLD = 0.4; // Lower = stricter, Higher = more lenient
```

**Recommended values:**
- `0.3` - Very strict (high security)
- `0.4` - Balanced (default)
- `0.5` - Lenient (more false positives)

## How the Algorithm Works

The system uses **facial landmark comparison**:

1. **Landmark Detection**: Identifies key facial points (eyes, nose, mouth, etc.)
2. **Normalization**: Adjusts for different face sizes and positions
3. **Distance Calculation**: Measures how far apart corresponding landmarks are
4. **Similarity Score**: Converts distance to a 0-100% similarity score

**Formula:**
```
similarity = e^(-k × average_distance)
```

Where `k=5` is the sensitivity parameter.

## Advantages

✅ **No API Required**: Works completely offline
✅ **No Registration**: No user accounts or face database
✅ **Privacy**: All processing happens in your browser
✅ **Fast**: Real-time comparison at 25 FPS
✅ **Free**: No API costs or limits

## Limitations

⚠️ **Lighting Sensitive**: Works best with good, consistent lighting
⚠️ **Angle Dependent**: Face should be at similar angle to reference
⚠️ **Landmark Based**: Relies on facial landmark detection accuracy
⚠️ **Not Cryptographic**: This is NOT a security system - for demo purposes only

## Use Cases

- **Photo Verification**: Check if a photo matches a person
- **Access Control Demo**: Simple face-based authentication
- **Identity Verification**: Confirm someone is who they claim to be
- **Fun Experiments**: See how similar you look to celebrities/friends

## Technical Details

### Dependencies

- TensorFlow.js
- MediaPipe Face Detection
- get-face-status library

### Browser Requirements

- Modern browser (Chrome, Firefox, Safari, Edge)
- WebRTC support for camera access
- JavaScript enabled
- HTTPS or localhost (for camera permissions)

### Performance

- **Detection Speed**: ~25 FPS
- **Comparison Speed**: Real-time (< 16ms per frame)
- **Memory Usage**: ~100-200 MB
- **CPU Usage**: Moderate (depends on video resolution)

## Troubleshooting

### "No face detected" in uploaded photo

- Ensure the face is clearly visible
- Try a photo with better lighting
- Face should be front-facing
- Remove sunglasses/masks

### Webcam not working

- Grant camera permissions
- Use HTTPS or localhost
- Close other apps using the camera
- Try refreshing the page

### Low similarity scores

- Ensure good lighting on both photo and webcam
- Face the camera at the same angle as the reference photo
- Remove glasses if they weren't in the reference
- Try a different reference photo

### False matches

- Lower the `SIMILARITY_THRESHOLD` value
- Use a clearer reference photo
- Ensure good lighting conditions

## Comparison: Local vs API

| Feature | Local Demo | API Demo |
|---------|-----------|----------|
| **Setup** | No setup | API credentials required |
| **Privacy** | 100% local | Data sent to server |
| **Cost** | Free | May have API costs |
| **Accuracy** | Good | Excellent |
| **Speed** | Fast | Depends on network |
| **Persistence** | No storage | Stores faces in database |
| **Use Case** | Quick checks | Production systems |

## Security Note

⚠️ **This is a demo, not a security system!**

- Do NOT use for actual authentication
- Facial landmarks can be spoofed
- No liveness detection
- No anti-spoofing measures
- For educational/demo purposes only

For production use, consider:
- The API-based demo with proper backend
- Liveness detection
- Multi-factor authentication
- Professional biometric systems

## Next Steps

- Try the **API-based demo** at `examples/face-comparison/`
- Read the **integration guide** at `docs/melon-api-integration.md`
- Explore the **source code** to understand the algorithm
- Adjust the threshold for your use case

## Support

For issues or questions:
- Check the main project README
- Review the source code in `index.js`
- Open an issue on GitHub

---

**Enjoy comparing faces! 📸**
