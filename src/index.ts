import { sortFaces } from "./best_face";
import { checkMargin, checkMultiFace, checkSize } from "./check_face";
import { defaultConfig } from "./default_config";
import { getFaceNormalizer } from "./face_normalizer";
import { FaceStatus } from "./face_status";
import { Face, Shape } from "./types";

export { FaceStatus };
export type { Face };

// Export Melon API Client
import { MelonApiClient } from "./melon_api_client";
export { MelonApiClient };
export type * from "./melon_types";

export function getFaceStatus(faces: any, shape: Shape, options = {}) {
  if (typeof faces !== "object" || faces === null) {
    throw new Error("`faces` must be a non-null object.");
  }

  if (faces.some((face: any) => typeof face !== "object" || face === null)) {
    throw new Error("Each value in `faces` must be a non-null object.");
  }

  if (typeof shape !== "object" || shape === null) {
    throw new Error("`shape` must be a non-null object.");
  }

  if (typeof options !== "object" || options === null) {
    throw new Error("`options` must be a non-null object.");
  }

  const config = { ...defaultConfig, ...options };
  const facesNormalized: Face[] = getFaceNormalizer(config)(faces);

  let status: FaceStatus = FaceStatus.NO_FACE;
  let face: Face | null = null;

  if (facesNormalized.length > 0) {
    const sortedFaces = sortFaces(facesNormalized, shape);
    status = FaceStatus.OK;
    face = sortedFaces[0];

    if (sortedFaces.length > 1) {
      const secondFace = sortedFaces[1];
      status = checkMultiFace(face.box, secondFace.box, config);
    }

    if (status == FaceStatus.OK) {
      status = checkMargin(face.box, shape, config);
    }

    if (status == FaceStatus.OK) {
      status = checkSize(face.box, shape, config);
    }
  }

  return { status, face };
}

if (typeof window !== "undefined") {
  (window as any).mt = {
    getFaceStatus: getFaceStatus,
    FaceStatus: FaceStatus,
    MelonApiClient: MelonApiClient,
  };
}
