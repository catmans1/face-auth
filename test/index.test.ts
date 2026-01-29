/**
 * @vitest-environment jsdom
 */

import { describe, expect, test } from "vitest";
import { FaceStatus } from "../src/face_status";
import { getFaceStatus } from "../src/index";

describe("index", () => {
  const shape = { width: 100, height: 100 };
  const face1 = { box: { xMin: 60, xMax: 100, yMin: 60, yMax: 100 } };
  const face2 = { box: { xMin: 25, xMax: 75, yMin: 25, yMax: 75 } };
  const face3 = { box: { xMin: 0, xMax: 40, yMin: 0, yMax: 40 } };

  test("FaceStatus.OK", () => {
    const { status, face } = getFaceStatus([face1, face2, face3], shape);
    expect(status).toBe(FaceStatus.OK);
    expect(face).toEqual(face2);
  });

  test("FaceStatus.NO_FACE", () => {
    const { status, face } = getFaceStatus([], shape);
    expect(status).toBe(FaceStatus.NO_FACE);
    expect(face).toEqual(null);
  });

  test("Invalid faces/shape inputs", () => {
    const invalid_inputs = ["string", 42, true, null, undefined, () => {}];
    invalid_inputs.forEach((x) => {
      expect(() => getFaceStatus(x, shape)).toThrow();
      expect(() => getFaceStatus([face1, face2, x], shape)).toThrow();
      expect(() => getFaceStatus([face1, face2], x as any)).toThrow();
    });
  });

  test("Invalid options inputs", () => {
    const invalid_inputs = ["string", 42, true, null, () => {}];
    invalid_inputs.forEach((x) => {
      expect(() => getFaceStatus([face1], shape, x as any)).toThrow();
    });
  });
});
