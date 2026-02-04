import "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection";
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core";
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl";
import "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection";
import "../../dist/get_face_status.js";

// Configuration
const MELON_CONFIG = {
  apiEndpoint: "https://api-beta.melon.co.jp/v2",
  keyId: "0196b4a0-a995-7277-9a65-61f2aa3c6116",
  secretKey: "iuuRawYRnz4wl2mvYdPd7yLkV2gakkim9JRPtwiAllU=",
  subject: "teacher",
};

const MATCH_THRESHOLD = 0.5;
const DEFAULT_GALLERY = "default-gallery";

// Initialize Melon API Client
const melonClient = new mt.MelonApiClient(MELON_CONFIG);

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

// Load device info from localStorage
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

function updateDeviceUI() {
  if (deviceInfo) {
    btnRegisterDevice.textContent = "✓ Device Registered";
    btnRegisterDevice.disabled = true;
    btnAuthenticate.disabled = false;
  }
}

// Initialize camera
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

// Initialize face detector
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

// Draw face on canvas
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

// Update status overlay
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

// Capture image from video
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

// Show result
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

// Generate auto name for user
function generateUserName() {
  return `user-${Date.now()}`;
}

// =====================================================
// Upload Handling for Registration (Auto-sends to Melon Server)
// =====================================================

async function processUploadedImageRegister(file) {
  // Show canvas, hide placeholder
  uploadPlaceholderRegister.style.display = "none";
  canvasUploadRegister.style.display = "block";
  uploadStatusRegister.style.display = "block";
  btnClearUploadRegister.style.display = "block";

  uploadStatusRegister.textContent = "Loading image...";
  uploadStatusRegister.className = "status-overlay";
  registerResult.innerHTML = "";

  try {
    // Load image
    const img = await loadImage(file);

    // Draw image on canvas
    const ctx = canvasUploadRegister.getContext("2d");
    canvasUploadRegister.width = img.width;
    canvasUploadRegister.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Detect face locally first
    uploadStatusRegister.textContent = "Detecting face...";
    const faces = await detectorRegister.estimateFaces(canvasUploadRegister);

    if (faces.length === 0) {
      uploadStatusRegister.textContent = "No face detected";
      uploadStatusRegister.classList.add("error");
      showResult(registerResult, false, "No Face Detected", {
        Message: "Please upload an image with a clear face",
      });
      return false;
    }

    // Check face status
    const shape = { width: canvasUploadRegister.width, height: canvasUploadRegister.height };
    const options = { detectorType: "mediapipe" };
    const { status, face } = mt.getFaceStatus(faces, shape, options);

    // Draw face box
    if (face) {
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = status === mt.FaceStatus.OK ? "#4ade80" : "#f59e0b";
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

    if (status !== mt.FaceStatus.OK) {
      uploadStatusRegister.textContent = `Face issue: ${mt.FaceStatus[status]}`;
      uploadStatusRegister.classList.add("warning");
      showResult(registerResult, false, "Face Quality Issue", {
        Status: mt.FaceStatus[status],
        Message: "Please upload an image with better face quality",
      });
      return false;
    }

    // Convert canvas to blob
    const imageBlob = await canvasToBlob(canvasUploadRegister);

    // =====================================================
    // Send to Melon Server (Auto-registration)
    // =====================================================

    const displayName = generateUserName();

    // Step 1: Create user on server
    uploadStatusRegister.textContent = "Creating user on server...";
    const userResponse = await melonClient.createUser(displayName);
    currentUserUuid = userResponse.uuid;

    // Step 2: Upload face to server
    uploadStatusRegister.textContent = "Uploading face to server...";
    await melonClient.registerFace(currentUserUuid, imageBlob);

    // Step 3: Create token
    uploadStatusRegister.textContent = "Creating access token...";
    const now = Math.floor(Date.now() / 1000);
    const validFrom = now;
    const validThrough = now + 365 * 24 * 60 * 60; // 1 year

    await melonClient.createUserToken(currentUserUuid, validFrom, validThrough, {
      gallery: DEFAULT_GALLERY,
    });

    // Success
    uploadStatusRegister.textContent = "Registration complete!";
    uploadStatusRegister.className = "status-overlay ok";
    showResult(registerResult, true, "Registration Successful", {
      "User UUID": currentUserUuid,
    });

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

// Helper: Load image from file
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

// Helper: Convert canvas to blob
function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
  });
}

// Upload area event listeners - Registration
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
// Authentication (Camera Only)
// =====================================================

// Authentication detection loop
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

// Authentication
let isAuthRunning = false;

async function authenticate() {
  if (!deviceInfo || isAuthRunning) return;

  isAuthRunning = true;
  statusAuth.textContent = "Authenticating...";
  authResult.innerHTML = "";

  try {
    const imageBlob = await captureImage(videoAuth, canvasAuth);

    const matchResponse = await melonClient.matchFace(
      imageBlob,
      deviceInfo.keyId,
      deviceInfo.secretKey
    );

    if (matchResponse.users && matchResponse.users.length > 0) {
      const bestMatch = matchResponse.users[0];
      const isMatch = bestMatch.score >= MATCH_THRESHOLD;

      statusAuth.textContent = isMatch
        ? "Authentication successful!"
        : "No match found";
      statusAuth.className = isMatch ? "status-overlay ok" : "status-overlay error";

      const resultData = {
        "User UUID": bestMatch.uuid,
        "Match Score": (bestMatch.score * 100).toFixed(2) + "%",
        Status: isMatch ? "✓ Authenticated" : "✗ Rejected",
      };

      showResult(
        authResult,
        isMatch,
        isMatch ? "Authentication Successful" : "Authentication Failed",
        resultData
      );

      // Add score bar
      if (isMatch) {
        const scoreBar = `
          <div style="margin-top: 1rem;">
            <div class="result-label">Confidence</div>
            <div class="score-bar">
              <div class="score-fill" style="width: ${bestMatch.score * 100}%"></div>
            </div>
          </div>
        `;
        authResult.querySelector(".result-card").innerHTML += scoreBar;
      }
    } else {
      statusAuth.textContent = "No faces matched";
      statusAuth.className = "status-overlay error";
      showResult(authResult, false, "No Match Found", {
        Message: "No registered faces matched the captured image",
      });
    }
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.status === 422) {
      const msg = error.message ? error.message.trim() : "Face quality issue";
      statusAuth.textContent = msg;
      statusAuth.className = "status-overlay warning";

      showResult(authResult, false, "Authentication Feedback", {
        Message: msg,
      });
    } else {
      statusAuth.textContent = "Authentication failed";
      statusAuth.className = "status-overlay error";
    }
  } finally {
    isAuthRunning = false;
  }
}

// Manual authenticate button click
btnAuthenticate.addEventListener("click", async () => {
  if (!deviceInfo) {
    showResult(authResult, false, "Device Not Registered", {
      Message: "Please register the device first",
    });
    return;
  }

  btnAuthenticate.classList.add("loading");
  btnAuthenticate.disabled = true;

  await authenticate();

  btnAuthenticate.classList.remove("loading");
  btnAuthenticate.disabled = false;
});

// =====================================================
// Initialize
// =====================================================

(async () => {
  loadDeviceInfo();

  // Initialize face detector for registration (upload)
  console.log("Loading face detector for registration...");
  detectorRegister = await initDetector();
  console.log("Registration detector ready");

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
