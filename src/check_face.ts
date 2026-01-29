import { FaceStatus } from "./face_status";
import { Box, Config, Shape } from "./types";

export function checkMargin(box: Box, shape: Shape, config: Config) {
  let status = FaceStatus.OK;

  if (box.xMin / shape.width < config.checkFaceMargin) {
    status = config.selfieMode ? FaceStatus.MOVE_RIGHT : FaceStatus.MOVE_LEFT;
  } else if (box.xMax / shape.width > 1 - config.checkFaceMargin) {
    status = config.selfieMode ? FaceStatus.MOVE_LEFT : FaceStatus.MOVE_RIGHT;
  } else if (box.yMin / shape.height < config.checkFaceMargin) {
    status = FaceStatus.MOVE_DOWN;
  } else if (box.yMax / shape.height > 1 - config.checkFaceMargin) {
    status = FaceStatus.MOVE_UP;
  }

  return status;
}

export function checkSize(box: Box, shape: Shape, config: Config) {
  let status = FaceStatus.OK;

  const widthRatio = (box.xMax - box.xMin) / shape.width;

  if (widthRatio < config.checkFaceMinSize) {
    status = FaceStatus.MOVE_IN;
  } else if (widthRatio > config.checkFaceMaxSize) {
    status = FaceStatus.MOVE_OUT;
  }

  return status;
}

/**
 * Checks the size ratio between two faces
 */
export function checkMultiFace(faceBox1: Box, faceBox2: Box, config: Config) {
  let status = FaceStatus.OK;

  const width1 = faceBox1.xMax - faceBox1.xMin;
  const height1 = faceBox1.yMax - faceBox1.yMin;
  const area1 = width1 * height1;

  const width2 = faceBox2.xMax - faceBox2.xMin;
  const height2 = faceBox2.yMax - faceBox2.yMin;
  const area2 = width2 * height2;

  const areaRatio = area2 / area1;

  if (areaRatio > config.checkMultiFaceAreaRatio) {
    status = FaceStatus.MULTIPLE_FACES;
  }

  return status;
}
