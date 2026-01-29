import { describe, expect, test } from "vitest";
import { euclidean2D, bestFaceScore, sortFaces } from "../src/best_face";

describe("euclidean2D", () => {
  test("euclidean distance between (0,0) and (3,4) should be 5", () => {
    const pt1 = { x: 0, y: 0 };
    const pt2 = { x: 3, y: 4 };
    expect(euclidean2D(pt1, pt2)).toBe(5);
  });

  test("euclidean distance between the same point", () => {
    const pt1 = { x: 1, y: 1 };
    expect(euclidean2D(pt1, pt1)).toBe(0);
  });

  test("euclidean distance should be positive", () => {
    const pt1 = { x: -1, y: -2 };
    const pt2 = { x: -3, y: -4 };
    expect(euclidean2D(pt1, pt2)).toBeGreaterThan(0);
  });
});

describe("bestFaceScore", () => {
  test("box at the center of the shape", () => {
    const shape = { width: 20, height: 20 };
    const box = { xMin: 5, xMax: 15, yMin: 5, yMax: 15 };
    const width = box.xMax - box.xMin;
    const height = box.yMax - box.yMin;
    expect(bestFaceScore(box, shape)).toBe(width * height);
  });
});

describe("getBestFace", () => {
  const shape = { width: 20, height: 20 };
  const face1 = { box: { xMin: 10, xMax: 20, yMin: 10, yMax: 20 } };
  const face2 = { box: { xMin: 5, xMax: 15, yMin: 5, yMax: 15 } };
  const face3 = { box: { xMin: 0, xMax: 10, yMin: 0, yMax: 10 } };
  test("Best face criteria should return the face with the highest score", () => {
    const result = sortFaces([face1, face2, face3], shape);
    expect(result[0]).toEqual(face2);
  });

  test("Best face criteria with a single face should return that face", () => {
    const result = sortFaces([face1], shape);
    expect(result[0]).toEqual(face1);
  });
});
