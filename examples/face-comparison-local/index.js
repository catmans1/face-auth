import "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection";
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core";
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl";
import "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection";
import "../../dist/get_face_status.js";

// Configuration
const FPS = 25;
let SIMILARITY_THRESHOLD = 0.4; // User-adjustable threshold

// DOM Elements - Threshold Control
const thresholdSlider = document.getElementById("threshold-slider");
const thresholdValue = document.getElementById("threshold-value");

// DOM Elements - Upload
const uploadArea = document.getElementById("upload-area");
const photoUpload = document.getElementById("photo-upload");
const uploadPlaceholder = document.getElementById("upload-placeholder");
const canvasReference = document.getElementById("canvas-reference");
const referenceStatus = document.getElementById("reference-status");
const btnClearReference = document.getElementById("btn-clear-reference");
const referenceResult = document.getElementById("reference-result");

const videoWebcam = document.getElementById("video-webcam");
const canvasWebcam = document.getElementById("canvas-webcam");
const statusWebcam = document.getElementById("status-webcam");
const comparisonResult = document.getElementById("comparison-result");

// State
let detectorReference = null;
let detectorWebcam = null;
let referenceFaceDescriptor = null;
let referenceFaceData = null;
let isComparing = false;

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
function drawFace(ctx, face, canvas, color = "#4ade80") {
  if (face) {
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
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

// Calculate face similarity based on landmarks
function calculateFaceSimilarity(face1, face2) {
  if (!face1.landmarks || !face2.landmarks) {
    return 0;
  }

  // Ensure both faces have the same number of landmarks
  const minLandmarks = Math.min(face1.landmarks.length, face2.landmarks.length);
  if (minLandmarks === 0) return 0;

  // Calculate normalized distances between corresponding landmarks
  let totalDistance = 0;

  // Get face sizes for normalization
  const face1Width = face1.box.xMax - face1.box.xMin;
  const face1Height = face1.box.yMax - face1.box.yMin;
  const face2Width = face2.box.xMax - face2.box.xMin;
  const face2Height = face2.box.yMax - face2.box.yMin;

  const face1Size = Math.sqrt(face1Width * face1Width + face1Height * face1Height);
  const face2Size = Math.sqrt(face2Width * face2Width + face2Height * face2Height);

  for (let i = 0; i < minLandmarks; i++) {
    const p1 = face1.landmarks[i];
    const p2 = face2.landmarks[i];

    // Normalize coordinates relative to face box
    const norm1X = (p1.x - face1.box.xMin) / face1Width;
    const norm1Y = (p1.y - face1.box.yMin) / face1Height;
    const norm2X = (p2.x - face2.box.xMin) / face2Width;
    const norm2Y = (p2.y - face2.box.yMin) / face2Height;

    // Calculate Euclidean distance
    const dx = norm1X - norm2X;
    const dy = norm1Y - norm2Y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    totalDistance += distance;
  }

  // Average distance
  const avgDistance = totalDistance / minLandmarks;

  // Convert distance to similarity score (0-1, where 1 is identical)
  // Using exponential decay: similarity = e^(-k * distance)
  const k = 5; // Sensitivity parameter
  const similarity = Math.exp(-k * avgDistance);

  return similarity;
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

// Process uploaded image
async function processUploadedImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const img = new Image();

      img.onload = async () => {
        // Draw image on canvas
        const ctx = canvasReference.getContext("2d");
        canvasReference.width = img.width;
        canvasReference.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Show canvas, hide placeholder
        uploadPlaceholder.style.display = "none";
        canvasReference.style.display = "block";
        referenceStatus.style.display = "block";
        btnClearReference.style.display = "block";

        referenceStatus.textContent = "Detecting face...";
        referenceStatus.className = "status-overlay";

        try {
          // Detect face in uploaded image
          const faces = await detectorReference.estimateFaces(canvasReference);

          if (faces.length === 0) {
            referenceStatus.textContent = "No face detected";
            referenceStatus.classList.add("error");
            showResult(referenceResult, false, "No Face Detected", {
              Message: "Please upload an image with a clear face",
            });
            resolve(false);
            return;
          }

          if (faces.length > 1) {
            referenceStatus.textContent = "Multiple faces detected";
            referenceStatus.classList.add("warning");
          }

          // Use the first/largest face
          const shape = { width: canvasReference.width, height: canvasReference.height };
          const options = { detectorType: "mediapipe" };
          const { status, face } = mt.getFaceStatus(faces, shape, options);

          if (face) {
            referenceFaceData = face;
            drawFace(ctx, face, canvasReference, "#8b5cf6");

            referenceStatus.textContent = "Face detected - Ready to compare";
            referenceStatus.classList.add("ok");

            showResult(referenceResult, true, "Reference Face Loaded", {
              Status: mt.FaceStatus[status],
              Landmarks: face.landmarks ? face.landmarks.length : "N/A",
            });

            // Start comparison
            isComparing = true;
            resolve(true);
          } else {
            referenceStatus.textContent = "Face quality check failed";
            referenceStatus.classList.add("error");
            showResult(referenceResult, false, "Face Quality Issue", {
              Status: mt.FaceStatus[status],
            });
            resolve(false);
          }
        } catch (error) {
          console.error("Face detection error:", error);
          referenceStatus.textContent = "Error detecting face";
          referenceStatus.classList.add("error");
          showResult(referenceResult, false, "Detection Error", {
            Error: error.message,
          });
          resolve(false);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

// Upload area interactions
uploadArea.addEventListener("click", () => {
  photoUpload.click();
});

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", async (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type.startsWith("image/")) {
    await processUploadedImage(files[0]);
  }
});

photoUpload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    await processUploadedImage(file);
  }
});

btnClearReference.addEventListener("click", () => {
  referenceFaceData = null;
  isComparing = false;

  uploadPlaceholder.style.display = "flex";
  canvasReference.style.display = "none";
  referenceStatus.style.display = "none";
  btnClearReference.style.display = "none";

  referenceResult.innerHTML = "";
  comparisonResult.innerHTML = "";
  photoUpload.value = "";
});

// Threshold slider control
thresholdSlider.addEventListener("input", (e) => {
  const value = parseInt(e.target.value);
  SIMILARITY_THRESHOLD = value / 100;
  thresholdValue.textContent = value;
});

// Webcam comparison loop
async function startWebcamComparison() {
  const ctx = canvasWebcam.getContext("2d");

  const detect = async () => {
    try {
      const estimationConfig = { flipHorizontal: false };
      const faces = await detectorWebcam.estimateFaces(videoWebcam, estimationConfig);

      const shape = {
        width: videoWebcam.videoWidth,
        height: videoWebcam.videoHeight,
      };
      const options = { detectorType: "mediapipe" };
      const { status, face } = mt.getFaceStatus(faces, shape, options);

      // Clear canvas
      ctx.clearRect(0, 0, canvasWebcam.width, canvasWebcam.height);

      if (!isComparing || !referenceFaceData) {
        statusWebcam.textContent = "Upload a reference photo to start comparing";
        statusWebcam.className = "status-overlay";
        drawFace(ctx, face, canvasWebcam);
      } else if (status === mt.FaceStatus.OK && face) {
        // Compare faces
        const similarity = calculateFaceSimilarity(referenceFaceData, face);
        const isMatch = similarity >= SIMILARITY_THRESHOLD;

        const color = isMatch ? "#4ade80" : "#f43f5e";
        drawFace(ctx, face, canvasWebcam, color);

        statusWebcam.textContent = `Similarity: ${(similarity * 100).toFixed(1)}% - ${isMatch ? "MATCH!" : "No Match"}`;
        statusWebcam.className = isMatch ? "status-overlay match" : "status-overlay no-match";

        // Update comparison result
        const resultData = {
          "Similarity Score": `${(similarity * 100).toFixed(2)}%`,
          "Threshold": `${(SIMILARITY_THRESHOLD * 100).toFixed(0)}%`,
          "Result": isMatch ? "✓ Match" : "✗ No Match",
        };

        showResult(comparisonResult, isMatch, isMatch ? "Face Match Detected" : "Different Person", resultData);

        // Add similarity bar
        const similarityBar = `
          <div style="margin-top: 1rem;">
            <div class="result-label">Confidence</div>
            <div class="similarity-bar">
              <div class="similarity-fill" style="width: ${similarity * 100}%"></div>
            </div>
          </div>
        `;
        comparisonResult.querySelector(".result-card").innerHTML += similarityBar;
      } else {
        statusWebcam.textContent = mt.FaceStatus[status];
        statusWebcam.className = "status-overlay warning";
        drawFace(ctx, face, canvasWebcam);
      }
    } catch (error) {
      console.error("Detection error:", error);
    }

    requestAnimationFrame(detect);
  };

  detect();
}

// Initialize
(async () => {
  // Initialize reference detector
  statusWebcam.textContent = "Loading face detector...";
  detectorReference = await initDetector();
  detectorWebcam = await initDetector();

  // Initialize webcam
  statusWebcam.textContent = "Initializing camera...";
  const cameraOk = await initCamera(videoWebcam);
  if (!cameraOk) {
    statusWebcam.textContent = "Camera access denied";
    statusWebcam.classList.add("error");
    return;
  }

  videoWebcam.addEventListener("loadeddata", () => {
    canvasWebcam.width = videoWebcam.videoWidth;
    canvasWebcam.height = videoWebcam.videoHeight;
    statusWebcam.textContent = "Upload a reference photo to start";
    statusWebcam.className = "status-overlay";
    startWebcamComparison();
  });
})();
