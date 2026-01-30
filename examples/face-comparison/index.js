import "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection";
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core";
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl";
import "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection";
import "../../dist/get_face_status.js";

// Import Melon API Client (we'll use it as a module)
// import { MelonApiClient } from "../../dist/index.js";

// Configuration
const MELON_CONFIG = {
  apiEndpoint: "https://api-beta.melon.co.jp/v2",
  keyId: "0196b4a0-a995-7277-9a65-61f2aa3c6116",
  secretKey: "iuuRawYRnz4wl2mvYdPd7yLkV2gakkim9JRPtwiAllU=",
  subject: "teacher",
};

const FPS = 25;
const MATCH_THRESHOLD = 0.5;

// Initialize Melon API Client
const melonClient = new mt.MelonApiClient(MELON_CONFIG);

// DOM Elements - Registration
const videoRegister = document.getElementById("video-register");
const canvasRegister = document.getElementById("canvas-register");
const statusRegister = document.getElementById("status-register");
const displayNameInput = document.getElementById("display-name");
const galleryNameInput = document.getElementById("gallery-name");
const btnRegister = document.getElementById("btn-register");
const registerResult = document.getElementById("register-result");

// DOM Elements - Authentication
const videoAuth = document.getElementById("video-auth");
const canvasAuth = document.getElementById("canvas-auth");
const statusAuth = document.getElementById("status-auth");
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

// Registration detection loop
async function startRegistrationDetection() {
  const ctx = canvasRegister.getContext("2d");

  const detect = async () => {
    try {
      const estimationConfig = { flipHorizontal: false };
      const faces = await detectorRegister.estimateFaces(
        videoRegister,
        estimationConfig
      );

      const shape = {
        width: videoRegister.videoWidth,
        height: videoRegister.videoHeight,
      };
      const options = { detectorType: "mediapipe" };
      const { status, face } = mt.getFaceStatus(faces, shape, options);

      statusRegister.textContent = mt.FaceStatus[status];
      updateStatus(statusRegister, "info", status);

      drawFace(ctx, face, canvasRegister);

      // Enable register button only if face is OK and name is entered
      btnRegister.disabled = !(
        status === mt.FaceStatus.OK && displayNameInput.value.trim()
      );
    } catch (error) {
      console.error("Detection error:", error);
    }

    requestAnimationFrame(detect);
  };

  detect();
}

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

// Register face
btnRegister.addEventListener("click", async () => {
  btnRegister.classList.add("loading");
  btnRegister.disabled = true;
  registerResult.innerHTML = "";

  try {
    const displayName = displayNameInput.value.trim();
    const galleryName = galleryNameInput.value.trim() || "default-gallery";

    // Step 1: Create user
    statusRegister.textContent = "Creating user...";
    const userResponse = await melonClient.createUser(displayName);
    currentUserUuid = userResponse.uuid;

    // Step 2: Capture and upload face
    statusRegister.textContent = "Capturing face...";
    const imageBlob = await captureImage(videoRegister, canvasRegister);

    statusRegister.textContent = "Uploading face...";
    await melonClient.registerFace(currentUserUuid, imageBlob);

    // Step 3: Create token
    statusRegister.textContent = "Creating token...";
    const now = Math.floor(Date.now() / 1000);
    const validFrom = now;
    const validThrough = now + 365 * 24 * 60 * 60; // 1 year

    await melonClient.createUserToken(currentUserUuid, validFrom, validThrough, {
      gallery: galleryName,
    });

    statusRegister.textContent = "Registration complete!";
    showResult(registerResult, true, "Registration Successful", {
      "User UUID": currentUserUuid,
      "Display Name": displayName,
      Gallery: galleryName,
    });
  } catch (error) {
    console.error("Registration error:", error);
    statusRegister.textContent = "Registration failed";
    showResult(registerResult, false, "Registration Failed", {
      Error: error.message || error.error || "Unknown error",
    });
  } finally {
    btnRegister.classList.remove("loading");
    btnRegister.disabled = false;
  }
});

// Register device
btnRegisterDevice.addEventListener("click", async () => {
  btnRegisterDevice.classList.add("loading");
  btnRegisterDevice.disabled = true;
  authResult.innerHTML = "";

  try {
    const galleryName = galleryNameInput.value.trim() || "default-gallery";
    const deviceName = `device-${Date.now()}`;

    statusAuth.textContent = "Registering device...";
    const deviceResponse = await melonClient.createDevice(deviceName, {
      gallery: galleryName,
    });

    statusAuth.textContent = "Generating device key...";
    const keyResponse = await melonClient.createDeviceKey(deviceResponse.uuid);
    console.log("Device Key Response:", keyResponse); // Debug logs

    saveDeviceInfo({
      uuid: deviceResponse.uuid,
      displayName: deviceResponse.display_name,
      keyId: keyResponse.uuid,
      secretKey: keyResponse.secret, // Fixed: API returns 'secret', not 'key'
      gallery: galleryName,
    });

    statusAuth.textContent = "Device registered!";
    showResult(authResult, true, "Device Registration Successful", {
      "Device UUID": deviceResponse.uuid,
      "Key ID": keyResponse.uuid,
      Gallery: galleryName,
    });

    // Start auto-authentication
    startAutoAuth();
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

// Auto-Authentication Loop
let isAuthRunning = false;
let autoAuthTimer = null;

async function authenticate() {
  if (!deviceInfo || isAuthRunning) return;

  isAuthRunning = true;
  statusAuth.textContent = "Auto-authenticating...";
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
      showResult(authResult, false, "No Match Found", {
        Message: "No registered faces matched the captured image",
      });
    }
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.status === 422) {
      statusAuth.textContent = error.message ? error.message.trim() : "Face quality issue";
      statusAuth.className = "status-overlay warning";
    } else {
      statusAuth.textContent = "Authentication failed (Retrying...)";
    }
    // Don't show full error UI on auto-retry to avoid flicker/spam
  } finally {
    isAuthRunning = false;
  }
}

function startAutoAuth() {
  if (autoAuthTimer) clearTimeout(autoAuthTimer);

  const loop = async () => {
    if (deviceInfo) {
      await authenticate();
    }
    // Schedule next run
    autoAuthTimer = setTimeout(loop, 5000);
  };

  loop();
}

// Start auto-auth when device is ready
if (deviceInfo) {
  startAutoAuth();
}

// Update device registration to start auto-auth
// (Modify btnRegisterDevice listener below)

// Enable register button when name is entered
displayNameInput.addEventListener("input", () => {
  // Will be enabled by detection loop if face is OK
});

// Initialize
(async () => {
  loadDeviceInfo();

  // Initialize registration
  statusRegister.textContent = "Initializing camera...";
  const cameraOk1 = await initCamera(videoRegister);
  if (!cameraOk1) {
    statusRegister.textContent = "Camera access denied";
    updateStatus(statusRegister, "error");
    return;
  }

  statusRegister.textContent = "Loading face detector...";
  detectorRegister = await initDetector();

  videoRegister.addEventListener("loadeddata", () => {
    canvasRegister.width = videoRegister.videoWidth;
    canvasRegister.height = videoRegister.videoHeight;
    statusRegister.textContent = "Ready";
    startRegistrationDetection();
  });

  // Initialize authentication
  statusAuth.textContent = "Initializing camera...";
  const cameraOk2 = await initCamera(videoAuth);
  if (!cameraOk2) {
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
