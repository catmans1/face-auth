import "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection";
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core";
import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl";
import "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection";
import "../../dist/get_face_status.js";

(async () => {
  const fps = 25;
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const text = document.getElementById("text");
  const ctx = canvas.getContext("2d");

  const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
  const detectorConfig = {
    runtime: "mediapipe",
    maxFaces: 1,
    modelType: "short",
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection",
  };

  const detector = await faceDetection.createDetector(model, detectorConfig);

  try {
    const constraints = { video: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
  } catch (error) {
    console.error(error);
  }

  video.addEventListener("loadeddata", async () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    setInterval(async () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const estimationConfig = { flipHorizontal: false };
        const faces = await detector.estimateFaces(video, estimationConfig);

        const shape = { width: video.videoWidth, height: video.videoHeight };
        const options = { detectorType: "mediapipe" };
        const { status, face } = mt.getFaceStatus(faces, shape, options);

        text.innerHTML = mt.FaceStatus[status];

        if (status == mt.FaceStatus.OK && face != null) {
          ctx.beginPath();
          ctx.lineWidth = 4;
          ctx.strokeStyle = "blue";
          ctx.rect(
            face.box.xMin,
            face.box.yMin,
            face.box.xMax - face.box.xMin,
            face.box.yMax - face.box.yMin
          );
          ctx.stroke();
          ctx.fillStyle = "red";
          face.landmarks.forEach((pt) => {
            ctx.fillRect(pt.x, pt.y, 5, 5);
          });
        }
      } catch (error) {
        console.error(error);
      }
    }, 1 / fps);
  });
})();
