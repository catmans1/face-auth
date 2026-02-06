import "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection";
// TensorFlow.js 1.7.0 is loaded via script tag in HTML (for face-api.js compatibility)
// Backend and face-detection model can use the global tf from the script tag
import "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection";
import "../../dist/get_face_status.js";

// Configuration - v2
const MELON_CONFIG_V2 = {
  apiEndpoint: "https://api-beta.melon.co.jp/v2",
  keyId: "0196b4a0-a995-7277-9a65-61f2aa3c6116",
  secretKey: "iuuRawYRnz4wl2mvYdPd7yLkV2gakkim9JRPtwiAllU=",
  subject: "teacher",
};

// Configuration - v3
const MELON_CONFIG_V3 = {
  apiEndpoint: "https://api-beta.melon.co.jp",
  keyId: "019c2872-a474-7384-9669-7caabfe8cb00",
  secretKey: "D-ZJS6bS4bjZN93d3KQ0VZ8NTqsxxvngUNI8FNrPOP8=",
  subject: "teacher",
};

const MATCH_THRESHOLD = 0.5;
const DEFAULT_GALLERY = "default-gallery";

// Current API version (v2 or v3)
let currentApiVersion = "v3";
let melonClient = null;

// face-api.js model URL - will try multiple paths (local first, then CDN)
let FACE_API_MODEL_URL = "../../face-api.js-master/weights"; // Default for local development

// Production: face-api assets (script and weights at same base)
const FACEAPI_ASSETS_BASE = 'https://assets-stg.share-wis.com/faceapi';

// Function to detect available model path
async function detectModelPath() {
  const isLocalhost = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '';
  const basePath = window.location.pathname.split('/examples/face-comparison')[0] || '';

  // Local: face-api.js-master, public, then FACEAPI_ASSETS_BASE. Production: assets URL only
  const paths = isLocalhost
    ? [
        "../../face-api.js-master/weights",
        "/face-api.js-master/weights",
        "/public/face-api-weights",
        "../../public/face-api-weights",
        "/face-api-weights",
        basePath + "/face-api-weights",
        FACEAPI_ASSETS_BASE
      ]
    : [ FACEAPI_ASSETS_BASE ];

  console.log("🔍 Detecting available model path...");
  console.log(`  Environment: ${isLocalhost ? 'Local' : 'Production'}`);
  console.log(`  Paths: ${paths.join(', ')}`);
  console.log(`  Current URL: ${window.location.href}`);

  // Try to fetch a model manifest file to test if path is accessible
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    try {
      const testUrl = `${path}/face_recognition_model-weights_manifest.json`;
      console.log(`  [${i + 1}/${paths.length}] Testing: ${testUrl}`);

      const response = await fetch(testUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log(`✅ Model path available: ${path}`);
        console.log(`   Content-Type: ${contentType}`);
        return path;
      } else {
        console.log(`   ❌ Response status: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      // Continue to next path
      console.log(`   ⚠️ Error: ${e.message}`);
    }
  }

  console.error("❌ No model path available.");
  return null;
}

// DOM Elements - API Version
const apiVersionSelect = document.getElementById("api-version-select");

// Initialize Melon API Client (will be updated based on version)
function initializeMelonClient() {
  const config = currentApiVersion === "v3" ? MELON_CONFIG_V3 : MELON_CONFIG_V2;
  melonClient = new mt.MelonApiClient(config);
  console.log(`Melon API Client initialized for ${currentApiVersion}`);
}

// Initialize with default version
initializeMelonClient();

// DOM Elements - Registration (Upload Only)
const uploadContainerRegister = document.getElementById("upload-container-register");
const photoUploadRegister = document.getElementById("photo-upload-register");
const uploadPlaceholderRegister = document.getElementById("upload-placeholder-register");
const canvasUploadRegister = document.getElementById("canvas-upload-register");
const uploadStatusRegister = document.getElementById("upload-status-register");
const btnClearUploadRegister = document.getElementById("btn-clear-upload-register");
const registerResult = document.getElementById("register-result");

// DOM Elements - Authentication (Camera Only)
const videoAuth = document.getElementById("video-auth");
const canvasAuth = document.getElementById("canvas-auth");
const statusAuth = document.getElementById("status-auth");

// DOM Elements - Authentication (Buttons)
const btnRegisterDevice = document.getElementById("btn-register-device");
const btnAuthenticate = document.getElementById("btn-authenticate");
const authResult = document.getElementById("auth-result");

// State
let detectorRegister = null;
let detectorAuth = null;
let currentUserUuid = null;
let deviceInfo = null;

// face-api.js state
let faceApiReady = false;
let registeredFaceDescriptors = []; // Array of { uuid, descriptor }

// =====================================================
// face-api.js Functions
// =====================================================

// Load face-api.js models using helper functions
async function loadFaceApiModels() {
  // Wait for TensorFlow.js to be ready first
  let tfRetries = 20;
  while ((typeof tf === "undefined" || !window.tfjsReady) && tfRetries > 0) {
    console.log(`Waiting for TensorFlow.js... (${tfRetries} retries left)`);
    await new Promise((resolve) => setTimeout(resolve, 200));
    tfRetries--;
  }
  
  if (typeof tf === "undefined") {
    console.error("❌ TensorFlow.js failed to load");
    return false;
  }
  console.log("✅ TensorFlow.js is ready");

  // Wait for face-api.js to be available (with retries)
  let retries = 20;
  while (typeof faceapi === "undefined" && retries > 0) {
    console.log(`Waiting for face-api.js... (${retries} retries left)`);
    await new Promise((resolve) => setTimeout(resolve, 200));
    retries--;
  }

  if (typeof faceapi === "undefined") {
    console.error("❌ face-api.js failed to load after retries");
    console.error("Check: Is face-api.js script loaded? Is TensorFlow.js loaded?");
    return false;
  }
  console.log("✅ face-api.js is available");

  console.log("=== face-api.js Model Loading Start ===");
  console.log("face-api.js version:", faceapi.version || "unknown");

  // Detect available model path (local vs production assets URL)
  FACE_API_MODEL_URL = await detectModelPath();
  if (!FACE_API_MODEL_URL) {
    console.error("Cannot load face-api models: no path available.");
    return false;
  }
  console.log("Using model path:", FACE_API_MODEL_URL);

  try {
    // Load models in OFFICIAL order: detector first, then landmark, then recognition
    // (same as face-api.js examples: changeFaceDetector -> loadFaceLandmarkModel -> loadFaceRecognitionModel)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    console.log("1/5 Loading Face Detector...");
    if (isMobile) {
      await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL);
      console.log("    Loaded Tiny Face Detector:", faceapi.nets.tinyFaceDetector.isLoaded ? "Yes" : "No");
    } else {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_API_MODEL_URL);
      console.log("    Loaded SSD Mobilenet V1:", faceapi.nets.ssdMobilenetv1.isLoaded ? "Yes" : "No");
    }

    console.log("2/5 Loading Face Landmark Model...");
    if (isMobile) {
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_API_MODEL_URL);
      console.log("    Loaded Face Landmark 68 Tiny:", faceapi.nets.faceLandmark68TinyNet.isLoaded ? "Yes" : "No");
    } else {
      await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODEL_URL);
      console.log("    Loaded Face Landmark 68:", faceapi.nets.faceLandmark68Net.isLoaded ? "Yes" : "No");
    }

    console.log("3/5 Loading Face Recognition Model...");
    await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODEL_URL);
    console.log("    Loaded:", faceapi.nets.faceRecognitionNet.isLoaded ? "Yes" : "No");

    // 4 & 5: Load other detector/landmark for UI flexibility
    if (!isMobile) {
      console.log("4/5 Loading Tiny Face Detector (fallback)...");
      await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL);
      console.log("5/5 Loading Face Landmark 68 Tiny (fallback)...");
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_API_MODEL_URL);
    } else {
      console.log("4/5 Loading SSD Mobilenet V1 (fallback)...");
      await faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_API_MODEL_URL);
      console.log("5/5 Loading Face Landmark 68 (fallback)...");
      await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODEL_URL);
    }

    // Verify models loaded (matching production pattern)
    const areModelsLoaded = () => {
      if (isMobile) {
        return (
          faceapi.nets.faceRecognitionNet.isLoaded &&
          faceapi.nets.faceLandmark68TinyNet.isLoaded &&
          faceapi.nets.tinyFaceDetector.isLoaded
        );
      }
      return (
        faceapi.nets.faceRecognitionNet.isLoaded &&
        faceapi.nets.faceLandmark68Net.isLoaded &&
        faceapi.nets.ssdMobilenetv1.isLoaded
      );
    };

    const allLoaded = areModelsLoaded();

    console.log("=== Model Loading Summary ===");
    console.log("Face Recognition:", faceapi.nets.faceRecognitionNet.isLoaded ? "✓" : "✗");
    if (isMobile) {
      console.log("Face Landmark 68 Tiny:", faceapi.nets.faceLandmark68TinyNet.isLoaded ? "✓" : "✗");
      console.log("Tiny Face Detector:", faceapi.nets.tinyFaceDetector.isLoaded ? "✓" : "✗");
    } else {
      console.log("Face Landmark 68:", faceapi.nets.faceLandmark68Net.isLoaded ? "✓" : "✗");
      console.log("SSD Mobilenet V1:", faceapi.nets.ssdMobilenetv1.isLoaded ? "✓" : "✗");
    }
    console.log("All required models loaded:", allLoaded ? "✓ YES" : "✗ NO");

    if (allLoaded) {
      console.log("=== face-api.js Ready! ===");
      faceApiReady = true;
      return true;
    } else {
      console.error("Required models failed to load!");
      console.error("💡 Troubleshooting:");
      console.error("   1. Check if models are accessible: Run testModelPath() in console");
      console.error("   2. For Vercel: Ensure public/face-api-weights folder is committed to git");
      console.error("   3. Check Vercel deployment logs for file serving issues");
      console.error("   4. Current model path:", FACE_API_MODEL_URL);
      console.error("   5. Test URL:", `${FACE_API_MODEL_URL}/face_recognition_model-weights_manifest.json`);
      return false;
    }

  } catch (error) {
    console.error("Failed to load face-api.js models:", error);
    console.error("Error details:", error.message);
    console.error("Model URL:", FACE_API_MODEL_URL);
    console.error("💡 Debugging steps:");
    console.error("   1. Run testModelPath() in console to test paths");
    console.error("   2. Check browser Network tab for failed requests");
    console.error("   3. Verify public/face-api-weights exists in your repository");
    console.error("   4. Check Vercel deployment - ensure public folder is deployed");
    return false;
  }
}

// face-api.js Detection options (adjustable via UI)
let FACE_API_INPUT_SIZE = 512; // For TinyFaceDetector (options: 128, 160, 224, 320, 416, 512, 608)
let FACE_API_SCORE_THRESHOLD = 0.3; // For TinyFaceDetector (range: 0-1)
let FACE_API_MIN_CONFIDENCE = 0.3; // For SsdMobilenetv1 - use 0.3 for better detection
let FACE_API_USE_SSD = true; // Use SsdMobilenetv1 (more reliable) or TinyFaceDetector

// DOM Elements - face-api.js Detection Controls
const btnSsd = document.getElementById("btn-ssd");
const btnTiny = document.getElementById("btn-tiny");
const ssdControls = document.getElementById("ssd-controls");
const tinyControls = document.getElementById("tiny-controls");
const minConfidenceSlider = document.getElementById("min-confidence-slider");
const minConfidenceValue = document.getElementById("min-confidence-value");
const inputSizeSlider = document.getElementById("input-size-slider");
const inputSizeValue = document.getElementById("input-size-value");
const scoreThresholdSlider = document.getElementById("score-threshold-slider");
const scoreThresholdValue = document.getElementById("score-threshold-value");

// Compute face descriptor using face-api.js (matches official examples + tests)
async function computeFaceDescriptor(input) {
  console.log("🔍 computeFaceDescriptor called:", {
    faceApiReady,
    inputType: input?.constructor?.name,
    hasFaceApi: typeof faceapi !== "undefined"
  });
  
  if (!faceApiReady) {
    console.warn("⚠️ face-api.js not ready");
    return null;
  }

  if (typeof faceapi === "undefined") {
    console.error("❌ faceapi object is undefined!");
    return null;
  }

  try {
    const w = input.width || input.videoWidth;
    const h = input.height || input.videoHeight;
    console.log("=== face-api.js Detection ===", input.constructor.name, w, "x", h);

    // Same as official tests: SSD options + withFaceLandmarks() with NO arg (full landmark model)
    const ssdOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: FACE_API_MIN_CONFIDENCE });
    const tinyOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: FACE_API_INPUT_SIZE,
      scoreThreshold: FACE_API_SCORE_THRESHOLD
    });
    const options = FACE_API_USE_SSD ? ssdOptions : tinyOptions;
    console.log("🔍 Detection options:", FACE_API_USE_SSD ? "SSD" : "Tiny", options);

    // Official pattern from face-api.js tests: detectSingleFace(input, options).withFaceLandmarks().withFaceDescriptor()
    // Do NOT pass argument to withFaceLandmarks() - use full landmark model (default)
    console.log("🔍 Calling detectSingleFace...");
    let detection = await faceapi
      .detectSingleFace(input, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    console.log("🔍 detectSingleFace result:", detection ? "Found face" : "null");

    if (!detection) {
      console.log("  Fallback: detectAllFaces...");
      const all = await faceapi
        .detectAllFaces(input, options)
        .withFaceLandmarks()
        .withFaceDescriptors();
      console.log("🔍 detectAllFaces result:", all ? `${all.length} face(s)` : "null");
      if (all && all.length > 0) {
        detection = all.reduce((a, b) => (a.detection.score > b.detection.score ? a : b));
        console.log("  Found", all.length, "face(s), using best");
      }
    }

    if (detection) {
      console.log("✅ Face detected! Score:", detection.detection.score.toFixed(3));
      console.log("✅ Descriptor length:", detection.descriptor?.length);
      return detection.descriptor;
    }

    console.warn("✗ No face detected by face-api.js");
    return null;
  } catch (error) {
    console.error("❌ face-api.js error in computeFaceDescriptor:", error);
    console.error("Error details:", error.message, error.stack);
    return null;
  }
}

// Save face descriptor to localStorage
function saveFaceDescriptor(uuid, descriptor) {
  const stored = localStorage.getItem("faceDescriptors");
  const descriptors = stored ? JSON.parse(stored) : [];

  // Convert Float32Array to regular array for JSON storage
  const descriptorArray = Array.from(descriptor);

  descriptors.push({ uuid, descriptor: descriptorArray });
  localStorage.setItem("faceDescriptors", JSON.stringify(descriptors));

  // Update in-memory cache
  registeredFaceDescriptors = descriptors;
}

// Load face descriptors from localStorage
function loadFaceDescriptors() {
  const stored = localStorage.getItem("faceDescriptors");
  if (stored) {
    registeredFaceDescriptors = JSON.parse(stored);
    console.log(`Loaded ${registeredFaceDescriptors.length} face descriptors from storage`);
  }
}

// Find best match using face-api.js
function findBestFaceApiMatch(queryDescriptor) {
  console.log("🔍 findBestFaceApiMatch called:", {
    hasQueryDescriptor: !!queryDescriptor,
    queryDescriptorLength: queryDescriptor?.length,
    registeredFaceDescriptorsCount: registeredFaceDescriptors.length
  });
  
  if (!queryDescriptor || registeredFaceDescriptors.length === 0) {
    console.log("⚠️ findBestFaceApiMatch returning null:", {
      reason: !queryDescriptor ? "no query descriptor" : "no registered descriptors"
    });
    return null;
  }

  let bestMatch = null;
  let bestDistance = Infinity;

  console.log(`🔍 Comparing against ${registeredFaceDescriptors.length} registered face(s)...`);
  for (const registered of registeredFaceDescriptors) {
    const distance = faceapi.euclideanDistance(
      queryDescriptor,
      new Float32Array(registered.descriptor)
    );
    console.log(`  UUID ${registered.uuid}: distance = ${distance.toFixed(4)}`);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = {
        uuid: registered.uuid,
        distance: distance,
        similarity: Math.max(0, 1 - distance), // Convert distance to similarity (0-1)
      };
    }
  }

  console.log("✅ findBestFaceApiMatch result:", bestMatch ? {
    uuid: bestMatch.uuid,
    distance: bestMatch.distance.toFixed(4),
    similarity: (bestMatch.similarity * 100).toFixed(2) + "%"
  } : "no match found");
  
  return bestMatch;
}

// =====================================================
// Device & Storage Functions
// =====================================================

function loadDeviceInfo() {
  const stored = localStorage.getItem("melonDeviceInfo");
  if (stored) {
    deviceInfo = JSON.parse(stored);
    updateDeviceUI();
  }
}

function saveDeviceInfo(info) {
  deviceInfo = info;
  localStorage.setItem("melonDeviceInfo", JSON.stringify(info));
  updateDeviceUI();
}

// Enable Authenticate button when user/device is registered – do not require face-api descriptors
function updateDeviceUI() {
  if (currentApiVersion === "v2") {
    if (deviceInfo) {
      btnRegisterDevice.textContent = "✓ Device Registered";
      btnRegisterDevice.disabled = true;
      btnAuthenticate.disabled = false;
    } else {
      btnRegisterDevice.textContent = "Register Device";
      btnRegisterDevice.disabled = false;
      btnAuthenticate.disabled = true;
    }
  } else {
    // v3: Always enable Authenticate when user is registered (even if face-api could not get descriptor from upload)
    if (currentUserUuid) {
      btnAuthenticate.disabled = false;
    } else {
      btnAuthenticate.disabled = true;
    }
  }
}

// =====================================================
// Camera & Detection Functions
// =====================================================

async function initCamera(video) {
  try {
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    return true;
  } catch (error) {
    console.error("Camera error:", error);
    return false;
  }
}

async function initDetector() {
  const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
  const detectorConfig = {
    runtime: "mediapipe",
    maxFaces: 2,
    modelType: "short",
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection",
  };
  return await faceDetection.createDetector(model, detectorConfig);
}

function drawFace(ctx, face, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (face) {
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#4ade80";
    ctx.rect(
      face.box.xMin,
      face.box.yMin,
      face.box.xMax - face.box.xMin,
      face.box.yMax - face.box.yMin
    );
    ctx.stroke();

    if (face.landmarks) {
      ctx.fillStyle = "#f43f5e";
      face.landmarks.forEach((pt) => {
        ctx.fillRect(pt.x - 2.5, pt.y - 2.5, 5, 5);
      });
    }
  }
}

function updateStatus(statusElement, status, faceStatus) {
  statusElement.className = "status-overlay";

  if (status === "error") {
    statusElement.classList.add("error");
  } else if (faceStatus === mt.FaceStatus.OK) {
    statusElement.classList.add("ok");
  } else {
    statusElement.classList.add("warning");
  }
}

function captureImage(video, canvas) {
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/jpeg", 0.95);
  });
}

// =====================================================
// UI Helpers
// =====================================================

function showResult(container, success, title, data) {
  const resultClass = success ? "success" : "error";
  const icon = success ? "✓" : "✗";

  let html = `
    <div class="result-card ${resultClass}">
      <div class="result-title">${icon} ${title}</div>
  `;

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      html += `
        <div class="result-item">
          <span class="result-label">${key}:</span>
          <span class="result-value">${value}</span>
        </div>
      `;
    }
  }

  html += `</div>`;
  container.innerHTML = html;
}

function showDualResult(container, melonResult, faceApiResult) {
  let html = `<div style="display: flex; flex-direction: column; gap: 1rem;">`;

  // Melon API Result
  const melonClass = melonResult.success ? "success" : "error";
  const melonIcon = melonResult.success ? "✓" : "✗";
  html += `
    <div class="result-card ${melonClass}">
      <div class="result-title">${melonIcon} Melon API Result</div>
  `;
  if (melonResult.data) {
    for (const [key, value] of Object.entries(melonResult.data)) {
      html += `
        <div class="result-item">
          <span class="result-label">${key}:</span>
          <span class="result-value">${value}</span>
        </div>
      `;
    }
  }
  html += `</div>`;

  // face-api.js Result
  const faceApiClass = faceApiResult.success ? "success" : "error";
  const faceApiIcon = faceApiResult.success ? "✓" : "✗";
  html += `
    <div class="result-card ${faceApiClass}">
      <div class="result-title">${faceApiIcon} face-api.js Result</div>
  `;
  if (faceApiResult.data) {
    for (const [key, value] of Object.entries(faceApiResult.data)) {
      html += `
        <div class="result-item">
          <span class="result-label">${key}:</span>
          <span class="result-value">${value}</span>
        </div>
      `;
    }
  }
  html += `</div>`;

  html += `</div>`;
  container.innerHTML = html;
}

function generateUserName() {
  return `user-${Date.now()}`;
}

// =====================================================
// Upload Handling for Registration
// =====================================================

async function processUploadedImageRegister(file) {
  uploadPlaceholderRegister.style.display = "none";
  canvasUploadRegister.style.display = "block";
  uploadStatusRegister.style.display = "block";
  btnClearUploadRegister.style.display = "block";

  uploadStatusRegister.textContent = "Loading image...";
  uploadStatusRegister.className = "status-overlay";
  registerResult.innerHTML = "";

  try {
    const img = await loadImage(file);

    const ctx = canvasUploadRegister.getContext("2d");
    canvasUploadRegister.width = img.width;
    canvasUploadRegister.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Detect face locally (do not block registration: even if no face / bad status, still register with Melon and enable Authenticate)
    uploadStatusRegister.textContent = "Detecting face...";
    const faces = await detectorRegister.estimateFaces(canvasUploadRegister);

    let status = mt.FaceStatus.NO_FACE;
    if (faces.length > 0) {
      const shape = { width: canvasUploadRegister.width, height: canvasUploadRegister.height };
      const options = { detectorType: "mediapipe" };
      status = mt.getFaceStatus(faces, shape, options).status;
    }
    if (faces.length === 0) {
      uploadStatusRegister.textContent = "No face detected (registering with Melon anyway)";
      uploadStatusRegister.classList.add("warning");
    } else if (status !== mt.FaceStatus.OK) {
      uploadStatusRegister.textContent = `Face issue: ${mt.FaceStatus[status]} (registering with Melon anyway)`;
      uploadStatusRegister.classList.add("warning");
    }

    const imageBlob = await canvasToBlob(canvasUploadRegister);
    const displayName = generateUserName();

    // =====================================================
    // Step 1: Compute face descriptor with face-api.js
    // =====================================================
    let faceDescriptor = null;
    if (faceApiReady) {
      uploadStatusRegister.textContent = "Computing face descriptor (face-api.js)...";
      console.log("Computing face descriptor for registration...");
      console.log("Canvas size:", canvasUploadRegister.width, "x", canvasUploadRegister.height);
      faceDescriptor = await computeFaceDescriptor(canvasUploadRegister);
      if (faceDescriptor) {
        console.log("Face descriptor computed successfully:", faceDescriptor.length, "dimensions");
      } else {
        console.warn("face-api.js could not compute descriptor - face may not be detected");
      }
    } else {
      console.warn("face-api.js not ready yet, skipping local descriptor");
    }

    // =====================================================
    // Step 2: Register with Melon API (v2 or v3)
    // =====================================================
    if (currentApiVersion === "v3") {
      // v3: Simple 1-to-1 matching flow
      uploadStatusRegister.textContent = "Creating user on server (v3)...";
      const userResponse = await melonClient.createUserV3(displayName);
      currentUserUuid = userResponse.uuid;

      uploadStatusRegister.textContent = "Enrolling face (v3)...";
      await melonClient.enrollFaceV3(currentUserUuid, imageBlob, "face.jpg");
    } else {
      // v2: Device-based flow
      uploadStatusRegister.textContent = "Creating user on server (v2)...";
      const userResponse = await melonClient.createUser(displayName);
      currentUserUuid = userResponse.uuid;

      uploadStatusRegister.textContent = "Uploading face to server (v2)...";
      await melonClient.registerFace(currentUserUuid, imageBlob);

      uploadStatusRegister.textContent = "Creating access token (v2)...";
      const now = Math.floor(Date.now() / 1000);
      const validFrom = now;
      const validThrough = now + 365 * 24 * 60 * 60;

      await melonClient.createUserToken(currentUserUuid, validFrom, validThrough, {
        gallery: DEFAULT_GALLERY,
      });
    }

    // =====================================================
    // Step 3: Save face descriptor locally
    // =====================================================
    if (faceDescriptor) {
      saveFaceDescriptor(currentUserUuid, faceDescriptor);
    }

    // Success
    uploadStatusRegister.textContent = "Registration complete!";
    uploadStatusRegister.className = "status-overlay ok";
    showResult(registerResult, true, "Registration Successful", {
      "User UUID": currentUserUuid,
      "API Version": currentApiVersion,
      "Melon API": "✓ Registered",
      "face-api.js": faceDescriptor ? "✓ Descriptor saved" : "✗ Not available",
    });

    // Update UI for authentication button
    updateDeviceUI();

    return true;

  } catch (error) {
    console.error("Registration error:", error);
    uploadStatusRegister.textContent = "Registration failed";
    uploadStatusRegister.classList.add("error");
    showResult(registerResult, false, "Registration Failed", {
      Error: error.message || error.error || "Unknown error",
    });
    return false;
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
  });
}

// Upload area event listeners
uploadContainerRegister.addEventListener("click", () => {
  photoUploadRegister.click();
});

uploadContainerRegister.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadContainerRegister.classList.add("dragover");
});

uploadContainerRegister.addEventListener("dragleave", () => {
  uploadContainerRegister.classList.remove("dragover");
});

uploadContainerRegister.addEventListener("drop", async (e) => {
  e.preventDefault();
  uploadContainerRegister.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type.startsWith("image/")) {
    await processUploadedImageRegister(files[0]);
  }
});

photoUploadRegister.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    await processUploadedImageRegister(file);
  }
});

btnClearUploadRegister.addEventListener("click", (e) => {
  e.stopPropagation();

  uploadPlaceholderRegister.style.display = "flex";
  canvasUploadRegister.style.display = "none";
  uploadStatusRegister.style.display = "none";
  btnClearUploadRegister.style.display = "none";

  registerResult.innerHTML = "";
  photoUploadRegister.value = "";
});

// =====================================================
// face-api.js Detection Controls
// =====================================================

// Detector toggle
btnSsd.addEventListener("click", () => {
  FACE_API_USE_SSD = true;
  btnSsd.classList.add("active");
  btnTiny.classList.remove("active");
  ssdControls.style.display = "block";
  tinyControls.style.display = "none";
});

btnTiny.addEventListener("click", () => {
  FACE_API_USE_SSD = false;
  btnTiny.classList.add("active");
  btnSsd.classList.remove("active");
  tinyControls.style.display = "block";
  ssdControls.style.display = "none";
});

// Min Confidence (for SSD)
minConfidenceSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  FACE_API_MIN_CONFIDENCE = value;
  minConfidenceValue.textContent = value.toFixed(1);
});

// Input Size (for TinyFaceDetector)
inputSizeSlider.addEventListener("input", (e) => {
  const value = parseInt(e.target.value);
  FACE_API_INPUT_SIZE = value;
  inputSizeValue.textContent = value;
});

// Score Threshold (for TinyFaceDetector)
scoreThresholdSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  FACE_API_SCORE_THRESHOLD = value;
  scoreThresholdValue.textContent = value.toFixed(1);
});

// =====================================================
// Authentication (Camera Only) - Dual Results
// =====================================================

async function startAuthDetection() {
  const ctx = canvasAuth.getContext("2d");

  const detect = async () => {
    try {
      const estimationConfig = { flipHorizontal: false };
      const faces = await detectorAuth.estimateFaces(videoAuth, estimationConfig);

      const shape = {
        width: videoAuth.videoWidth,
        height: videoAuth.videoHeight,
      };
      const options = { detectorType: "mediapipe" };
      const { status, face } = mt.getFaceStatus(faces, shape, options);

      statusAuth.textContent = mt.FaceStatus[status];
      updateStatus(statusAuth, "info", status);

      drawFace(ctx, face, canvasAuth);
    } catch (error) {
      console.error("Detection error:", error);
    }

    requestAnimationFrame(detect);
  };

  detect();
}

// Register device
btnRegisterDevice.addEventListener("click", async () => {
  btnRegisterDevice.classList.add("loading");
  btnRegisterDevice.disabled = true;
  authResult.innerHTML = "";

  try {
    const deviceName = `device-${Date.now()}`;

    statusAuth.textContent = "Registering device...";
    const deviceResponse = await melonClient.createDevice(deviceName, {
      gallery: DEFAULT_GALLERY,
    });

    statusAuth.textContent = "Generating device key...";
    const keyResponse = await melonClient.createDeviceKey(deviceResponse.uuid);
    console.log("Device Key Response:", keyResponse);

    saveDeviceInfo({
      uuid: deviceResponse.uuid,
      displayName: deviceResponse.display_name,
      keyId: keyResponse.uuid,
      secretKey: keyResponse.secret,
      gallery: DEFAULT_GALLERY,
    });

    statusAuth.textContent = "Device registered!";
    showResult(authResult, true, "Device Registration Successful", {
      "Device UUID": deviceResponse.uuid,
      "Key ID": keyResponse.uuid,
    });

  } catch (error) {
    console.error("Device registration error:", error);
    statusAuth.textContent = "Device registration failed";
    showResult(authResult, false, "Device Registration Failed", {
      Error: error.message || error.error || "Unknown error",
    });
    btnRegisterDevice.disabled = false;
  } finally {
    btnRegisterDevice.classList.remove("loading");
  }
});

// Dual Authentication
let isAuthRunning = false;

async function authenticate() {
  // v2 requires deviceInfo, v3 requires currentUserUuid
  if (currentApiVersion === "v2" && !deviceInfo) return;
  if (currentApiVersion === "v3" && !currentUserUuid) {
    statusAuth.textContent = "Please register a user first";
    authResult.innerHTML = "";
    showResult(authResult, false, "No User Registered", {
      Message: "Please register a user before authenticating (v3 requires user_id)",
    });
    return;
  }
  if (isAuthRunning) return;

  isAuthRunning = true;
  statusAuth.textContent = "Authenticating...";
  authResult.innerHTML = "";

  let melonResult = { success: false, data: {} };
  let faceApiResultData = { success: false, data: {} };

  try {
    const imageBlob = await captureImage(videoAuth, canvasAuth);

    // =====================================================
    // Melon API Authentication (v2 or v3)
    // =====================================================
    statusAuth.textContent = `Authenticating with Melon API (${currentApiVersion})...`;
    try {
      if (currentApiVersion === "v3") {
        // v3: 1-to-1 matching with user_id
        const verifyResponse = await melonClient.verifyV3(
          currentUserUuid,
          imageBlob,
          "face.jpg"
        );

        const isMatch = verifyResponse.score >= MATCH_THRESHOLD;

        melonResult = {
          success: isMatch,
          data: {
            "User UUID": currentUserUuid,
            "Match Score": (verifyResponse.score * 100).toFixed(2) + "%",
            Status: isMatch ? "✓ Authenticated" : "✗ Rejected",
            "API Version": "v3",
          },
        };
      } else {
        // v2: Device-based matching
        const matchResponse = await melonClient.matchFace(
          imageBlob,
          deviceInfo.keyId,
          deviceInfo.secretKey
        );

        if (matchResponse.users && matchResponse.users.length > 0) {
          const bestMatch = matchResponse.users[0];
          const isMatch = bestMatch.score >= MATCH_THRESHOLD;

          melonResult = {
            success: isMatch,
            data: {
              "User UUID": bestMatch.uuid,
              "Match Score": (bestMatch.score * 100).toFixed(2) + "%",
              Status: isMatch ? "✓ Authenticated" : "✗ Rejected",
              "API Version": "v2",
            },
          };
        } else {
          melonResult = {
            success: false,
            data: {
              Status: "✗ No match found",
              "API Version": "v2",
            },
          };
        }
      }
    } catch (error) {
      console.error("Melon API error:", error);
      melonResult = {
        success: false,
        data: {
          Error: error.message || error.error || "API error",
          "API Version": currentApiVersion,
        },
      };
    }

    // =====================================================
    // face-api.js Authentication (returns distance only, no threshold check)
    // =====================================================
    statusAuth.textContent = "Authenticating with face-api.js...";
    console.log("🔍 face-api auth check:", {
      faceApiReady,
      registeredFaceDescriptorsCount: registeredFaceDescriptors.length,
      willCallFindBestMatch: faceApiReady && registeredFaceDescriptors.length > 0
    });
    if (faceApiReady && registeredFaceDescriptors.length > 0) {
      try {
        const queryDescriptor = await computeFaceDescriptor(canvasAuth);
        console.log("🔍 Query descriptor result:", queryDescriptor ? "Got descriptor" : "null/undefined");

        if (queryDescriptor) {
          console.log("✅ Calling findBestFaceApiMatch with descriptor length:", queryDescriptor.length);
          const bestMatch = findBestFaceApiMatch(queryDescriptor);
          console.log("🔍 findBestFaceApiMatch result:", bestMatch);

          if (bestMatch) {
            // Return distance/similarity with detection parameters
            const detectorInfo = FACE_API_USE_SSD
              ? { "Detector": "SsdMobilenetv1", "Min Confidence": FACE_API_MIN_CONFIDENCE }
              : { "Detector": "TinyFaceDetector", "Input Size": FACE_API_INPUT_SIZE, "Score Threshold": FACE_API_SCORE_THRESHOLD };

            faceApiResultData = {
              success: true,
              data: {
                "User UUID": bestMatch.uuid,
                "Distance": bestMatch.distance.toFixed(4),
                "Similarity": (bestMatch.similarity * 100).toFixed(2) + "%",
                ...detectorInfo,
                Status: "✓ Comparison Complete",
              },
            };
          } else {
            const detectorInfo = FACE_API_USE_SSD
              ? { "Detector": "SsdMobilenetv1", "Min Confidence": FACE_API_MIN_CONFIDENCE }
              : { "Detector": "TinyFaceDetector", "Input Size": FACE_API_INPUT_SIZE, "Score Threshold": FACE_API_SCORE_THRESHOLD };

            faceApiResultData = {
              success: false,
              data: {
                ...detectorInfo,
                Status: "✗ No registered faces to compare",
              },
            };
          }
        } else {
          const detectorInfo = FACE_API_USE_SSD
            ? { "Detector": "SsdMobilenetv1", "Min Confidence": FACE_API_MIN_CONFIDENCE }
            : { "Detector": "TinyFaceDetector", "Input Size": FACE_API_INPUT_SIZE, "Score Threshold": FACE_API_SCORE_THRESHOLD };

          faceApiResultData = {
            success: false,
            data: {
              ...detectorInfo,
              Status: "✗ Could not detect face",
            },
          };
        }
      } catch (error) {
        console.error("face-api.js error:", error);
        const detectorInfo = FACE_API_USE_SSD
          ? { "Detector": "SsdMobilenetv1", "Min Confidence": FACE_API_MIN_CONFIDENCE }
          : { "Detector": "TinyFaceDetector", "Input Size": FACE_API_INPUT_SIZE, "Score Threshold": FACE_API_SCORE_THRESHOLD };

        faceApiResultData = {
          success: false,
          data: {
            ...detectorInfo,
            Error: error.message || "Detection error",
          },
        };
      }
    } else {
      console.log("⚠️ Skipping face-api auth:", {
        faceApiReady,
        registeredFaceDescriptorsCount: registeredFaceDescriptors.length,
        reason: !faceApiReady ? "face-api models not loaded" : "no registered face descriptors"
      });
      const detectorInfo = FACE_API_USE_SSD 
        ? { "Detector": "SsdMobilenetv1", "Min Confidence": FACE_API_MIN_CONFIDENCE }
        : { "Detector": "TinyFaceDetector", "Input Size": FACE_API_INPUT_SIZE, "Score Threshold": FACE_API_SCORE_THRESHOLD };
      
      faceApiResultData = {
        success: false,
        data: {
          ...detectorInfo,
          Status: faceApiReady ? "✗ No registered faces" : "✗ Models not loaded",
        },
      };
    }

    // Display dual results
    const bothSuccess = melonResult.success && faceApiResultData.success;
    statusAuth.textContent = bothSuccess
      ? "Both authentications successful!"
      : "Authentication completed";
    statusAuth.className = bothSuccess ? "status-overlay ok" : "status-overlay warning";

    showDualResult(authResult, melonResult, faceApiResultData);

  } catch (error) {
    console.error("Authentication error:", error);
    statusAuth.textContent = "Authentication failed";
    statusAuth.className = "status-overlay error";
    showResult(authResult, false, "Authentication Failed", {
      Error: error.message || "Unknown error",
    });
  } finally {
    isAuthRunning = false;
  }
}

// Manual authenticate button click
btnAuthenticate.addEventListener("click", async () => {
  if (currentApiVersion === "v2" && !deviceInfo) {
    showResult(authResult, false, "Device Not Registered", {
      Message: "Please register the device first (v2)",
    });
    return;
  }

  if (currentApiVersion === "v3" && !currentUserUuid) {
    showResult(authResult, false, "User Not Registered", {
      Message: "Please register a user first (v3)",
    });
    return;
  }

  btnAuthenticate.classList.add("loading");
  btnAuthenticate.disabled = true;

  await authenticate();

  btnAuthenticate.classList.remove("loading");
  updateDeviceUI(); // Re-enable based on current state
});

// =====================================================
// API Version Change Handler
// =====================================================

function updateUIForApiVersion() {
  // Show/hide device registration button based on version
  if (currentApiVersion === "v3") {
    btnRegisterDevice.style.display = "none";
    // v3 doesn't need device registration
    if (deviceInfo) {
      // Clear device info when switching to v3
      deviceInfo = null;
      localStorage.removeItem("deviceInfo");
    }
  } else {
    btnRegisterDevice.style.display = "block";
  }

  // Update info box message
  const infoBox = document.querySelector(".info-box");
  if (infoBox) {
    if (currentApiVersion === "v3") {
      infoBox.innerHTML = `<strong>Note:</strong> v3 uses 1-to-1 matching. Register a user first, then authenticate against that user.`;
    } else {
      infoBox.innerHTML = `<strong>Note:</strong> Device registration is required only once. After that, you can authenticate multiple times.`;
    }
  }

  // Update button states
  updateDeviceUI();
}

// Set up API version change handler
if (apiVersionSelect) {
  apiVersionSelect.addEventListener("change", (e) => {
    currentApiVersion = e.target.value;
    initializeMelonClient();
    updateUIForApiVersion();
    console.log(`Switched to ${currentApiVersion} API`);

    // Clear results
    authResult.innerHTML = "";
    registerResult.innerHTML = "";
  });
} else {
  console.warn("API version select element not found");
}

// =====================================================
// Initialize
// =====================================================

(async () => {
  // Ensure dropdown matches currentApiVersion (v3 is default)
  if (apiVersionSelect) {
    apiVersionSelect.value = currentApiVersion;
    console.log(`Initialized with ${currentApiVersion} API (dropdown value: ${apiVersionSelect.value})`);
  } else {
    console.warn("API version select not found, using default:", currentApiVersion);
  }

  // Initialize client with default version (v3)
  initializeMelonClient();

  loadDeviceInfo();
  loadFaceDescriptors();

  // Set initial UI state
  updateUIForApiVersion();

  // Initialize face detector for registration (upload)
  console.log("Loading MediaPipe face detector for registration...");
  detectorRegister = await initDetector();
  console.log("Registration detector ready");

  // Load face-api.js models in background
  loadFaceApiModels().then((success) => {
    if (success) {
      console.log("face-api.js ready for dual authentication");
    } else {
      console.warn("face-api.js not available, using Melon API only");
    }
  });

  // Initialize authentication (camera)
  statusAuth.textContent = "Initializing camera...";
  const cameraOk = await initCamera(videoAuth);
  if (!cameraOk) {
    statusAuth.textContent = "Camera access denied";
    updateStatus(statusAuth, "error");
    return;
  }

  statusAuth.textContent = "Loading face detector...";
  detectorAuth = await initDetector();

  videoAuth.addEventListener("loadeddata", () => {
    canvasAuth.width = videoAuth.videoWidth;
    canvasAuth.height = videoAuth.videoHeight;
    statusAuth.textContent = "Ready";
    startAuthDetection();
  });
})();

// =====================================================
// Debug Functions (can be called from browser console)
// =====================================================

// Test face-api.js with the current video frame (matching production pattern)
window.testFaceApi = async function() {
  console.log("=== Testing face-api.js (production pattern) ===");

  if (typeof faceapi === "undefined") {
    console.error("faceapi object is undefined! Library not loaded.");
    return;
  }

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  console.log("\n--- Model Status ---");
  console.log("Device type:", isMobile ? "Mobile" : "Desktop");
  console.log("faceRecognitionNet:", faceapi.nets.faceRecognitionNet.isLoaded);
  if (isMobile) {
    console.log("faceLandmark68TinyNet:", faceapi.nets.faceLandmark68TinyNet.isLoaded);
    console.log("tinyFaceDetector:", faceapi.nets.tinyFaceDetector.isLoaded);
  } else {
    console.log("faceLandmark68Net:", faceapi.nets.faceLandmark68Net.isLoaded);
    console.log("ssdMobilenetv1:", faceapi.nets.ssdMobilenetv1.isLoaded);
  }

  // Check models (matching production pattern)
  const areModelsLoaded = () => {
    if (isMobile) {
      return (
        faceapi.nets.faceRecognitionNet.isLoaded &&
        faceapi.nets.faceLandmark68TinyNet.isLoaded &&
        faceapi.nets.tinyFaceDetector.isLoaded
      );
    }
    return (
      faceapi.nets.faceRecognitionNet.isLoaded &&
      faceapi.nets.faceLandmark68Net.isLoaded &&
      faceapi.nets.ssdMobilenetv1.isLoaded
    );
  };

  if (!areModelsLoaded()) {
    console.error("Required models not loaded!");
    return;
  }

  console.log("\n--- Test 1: Production pattern (with device-specific options) ---");
  console.log("Video dimensions:", videoAuth.videoWidth, "x", videoAuth.videoHeight);

  try {
    // Match production pattern exactly
    const getFaceDetectorOptions = () => {
      if (isMobile) {
        return new faceapi.TinyFaceDetectorOptions();
      }
      return new faceapi.SsdMobilenetv1Options();
    };

    const detection = await faceapi
      .detectSingleFace(videoAuth, getFaceDetectorOptions())
      .withFaceLandmarks(isMobile)  // Pass boolean for mobile
      .withFaceDescriptor();

    if (detection) {
      console.log("✓ SUCCESS! Face detected");
      console.log("  Score:", detection.detection.score.toFixed(4));
      console.log("  Box:", detection.detection.box);
      console.log("  Descriptor:", detection.descriptor.length, "dimensions");
    } else {
      console.log("✗ No face detected (detection is undefined)");
    }
  } catch (e) {
    console.error("Error:", e.message);
    console.error("Stack:", e.stack);
  }

  console.log("\n--- Test 2: With explicit SSD options (minConfidence: 0.1) ---");
  try {
    const detection = await faceapi
      .detectSingleFace(videoAuth, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 }))
      .withFaceLandmarks(false)
      .withFaceDescriptor();

    if (detection) {
      console.log("✓ SUCCESS! Face detected");
      console.log("  Score:", detection.detection.score.toFixed(4));
    } else {
      console.log("✗ No face detected");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  console.log("\n--- Test 3: Just detection (no landmarks) ---");
  try {
    const detection = await faceapi.detectSingleFace(videoAuth, getFaceDetectorOptions());
    if (detection) {
      console.log("✓ Basic detection works! Score:", detection.score.toFixed(4));
    } else {
      console.log("✗ Basic detection failed");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  console.log("\n=== Test Complete ===");
};

// Check model status
window.checkModels = function() {
  console.log("=== face-api.js Model Status ===");
  console.log("faceapi object exists:", typeof faceapi !== "undefined");
  if (typeof faceapi !== "undefined") {
    console.log("ssdMobilenetv1:", faceapi.nets.ssdMobilenetv1.isLoaded);
    console.log("tinyFaceDetector:", faceapi.nets.tinyFaceDetector.isLoaded);
    console.log("faceLandmark68Net:", faceapi.nets.faceLandmark68Net.isLoaded);
    console.log("faceLandmark68TinyNet:", faceapi.nets.faceLandmark68TinyNet.isLoaded);
    console.log("faceRecognitionNet:", faceapi.nets.faceRecognitionNet.isLoaded);
    console.log("faceApiReady flag:", faceApiReady);
  }
};

// Reload models manually
window.reloadModels = async function() {
  console.log("Reloading face-api.js models...");
  faceApiReady = false;
  await loadFaceApiModels();
};

// Test model path accessibility
window.testModelPath = async function() {
  console.log("=== Testing Model Path Accessibility ===");
  const paths = [
    "/face-api-weights",
    "../../face-api-weights",
    "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights"
  ];

  for (const path of paths) {
    const testUrl = `${path}/face_recognition_model-weights_manifest.json`;
    console.log(`\nTesting: ${testUrl}`);
    try {
      const response = await fetch(testUrl, { method: 'GET', mode: 'cors' });
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Headers:`, Object.fromEntries(response.headers.entries()));
      if (response.ok) {
        const text = await response.text();
        console.log(`  ✅ SUCCESS! Response length: ${text.length} bytes`);
        try {
          const json = JSON.parse(text);
          console.log(`  ✅ Valid JSON with ${Object.keys(json).length} keys`);
        } catch (e) {
          console.log(`  ⚠️ Not valid JSON: ${e.message}`);
        }
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  }
  console.log("\n=== Test Complete ===");
};

console.log("Debug functions available: testFaceApi(), checkModels(), reloadModels(), testModelPath()");
