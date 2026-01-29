import { Box, Face, Shape, Point } from "./types";

export function euclidean2D(pt1: Point, pt2: Point) {
  return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
}

export function bestFaceScore(faceBox: Box, shape: Shape) {
  const width = faceBox.xMax - faceBox.xMin;
  const height = faceBox.yMax - faceBox.yMin;
  const area = width * height;
  const midX = (faceBox.xMin + faceBox.xMax) / 2;
  const midY = (faceBox.yMin + faceBox.yMax) / 2;
  const shapeMidX = shape.width / 2;
  const shapeMidY = shape.height / 2;
  const pt1 = { x: midX, y: midY };
  const pt2 = { x: shapeMidX, y: shapeMidY };
  const dist = euclidean2D(pt1, pt2);
  return area - 2 * dist * dist;
}

export function sortFaces(faces: Face[], shape: Shape): Face[] {
  return faces.sort((face1, face2) => {
    const loss1 = bestFaceScore(face1.box, shape);
    const loss2 = bestFaceScore(face2.box, shape);
    return loss2 - loss1; // descending
  });
}
