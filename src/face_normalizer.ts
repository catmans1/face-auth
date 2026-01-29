import { Config, Face, Point } from "./types";

export function mediapipe(faces: any) {
  return faces.map((face: any): Face => {
    return {
      box: {
        xMin: face.box.xMin,
        yMin: face.box.yMin,
        xMax: face.box.xMax,
        yMax: face.box.yMax,
      },
      landmarks: face.keypoints.map((pt: any): Point => {
        return { x: pt.x, y: pt.y };
      }),
    };
  });
}

export function expo(faces: any) {
  return faces.map((face: any): Face => {
    return {
      box: {
        xMin: face.bounds.origin.x,
        yMin: face.bounds.origin.y,
        xMax: face.bounds.origin.x + face.bounds.size.width,
        yMax: face.bounds.origin.y + face.bounds.size.height,
      },
    };
  });
}

export function getFaceNormalizer(config: Config) {
  switch (config.detectorType) {
    case "mediapipe":
      return mediapipe;
    case "expo":
      return expo;
    default:
      return (faces: any) => {
        return faces;
      };
  }
}
