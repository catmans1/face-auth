/**
 * @vitest-environment jsdom
 */

import { describe, expect, test } from "vitest";
import { defaultConfig } from "../src/default_config";
import { getFaceNormalizer } from "../src/face_normalizer";
import { Config, Face } from "../src/types";

describe("mediapipe", () => {
  test("convert faces to face objects", () => {
    const options = { detectorType: "mediapipe" };
    const config: Config = { ...defaultConfig, ...options };
    const input = [
      {
        box: { xMin: 0, yMin: 0, xMax: 100, yMax: 100 },
        keypoints: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
      },
      {
        box: { xMin: 50, yMin: 50, xMax: 150, yMax: 150 },
        keypoints: [
          { x: 60, y: 70 },
          { x: 80, y: 90 },
        ],
      },
    ];

    const output: Face[] = [
      {
        box: { xMin: 0, yMin: 0, xMax: 100, yMax: 100 },
        landmarks: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
      },
      {
        box: { xMin: 50, yMin: 50, xMax: 150, yMax: 150 },
        landmarks: [
          { x: 60, y: 70 },
          { x: 80, y: 90 },
        ],
      },
    ];

    expect(getFaceNormalizer(config)(input)).toEqual(output);
  });
});

describe("expo", () => {
  test("convert faces to face objects", () => {
    const options = { detectorType: "expo" };
    const config: Config = { ...defaultConfig, ...options };
    const input = [
      {
        bounds: { origin: { x: 10, y: 20 }, size: { width: 50, height: 50 } },
      },
      {
        bounds: { origin: { x: 30, y: 40 }, size: { width: 70, height: 70 } },
      },
    ];

    const output: Face[] = [
      {
        box: { xMin: 10, yMin: 20, xMax: 60, yMax: 70 },
      },
      {
        box: { xMin: 30, yMin: 40, xMax: 100, yMax: 110 },
      },
    ];

    expect(getFaceNormalizer(config)(input)).toEqual(output);
  });
});
