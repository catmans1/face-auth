# Face Detector Thresholds (face-api.js)

This document describes the threshold controls for the face-comparison demo and their impact when you click **AUTHENTICATE**.

**Important:** All of these controls affect only the **face-api.js** result (the “face-api.js Result” card). The **Melon API** result (match score, authenticated or not) does **not** depend on these values.

---

## SsdMobilenetv1 (Accurate) – one control

| Control | Meaning | Effect when you change it | Impact when you click AUTHENTICATE |
|--------|---------|---------------------------|------------------------------------|
| **Min Confidence** (0.1–0.9) | Minimum confidence required for the detector to consider something a “face”. | **Lower (e.g. 0.1):** More detections, more risk of false faces. **Higher (e.g. 0.7–0.9):** Only very clear faces; fewer false positives, but “no face” more often. | **Lower:** face-api.js is more likely to find a face and show a “face-api.js Result” (distance/similarity). **Higher:** face-api.js may often show “Could not detect face” even when Melon still succeeds. |

---

## TinyFaceDetector (Fast) – two controls

| Control | Meaning | Effect when you change it | Impact when you click AUTHENTICATE |
|--------|---------|---------------------------|------------------------------------|
| **Input Size** (128–608) | Size of the image used inside the detector. Typical steps: 128, 160, 224, 320, 416, 512, 608. | **Smaller (e.g. 128):** Faster, less accurate; may miss faces or give weaker descriptors. **Larger (e.g. 608):** Slower, more accurate; better at finding faces and giving a descriptor. | **Smaller:** face-api.js may often fail to detect a face or give a less reliable descriptor. **Larger:** face-api.js is more likely to detect a face and show a result. |
| **Score Threshold** (0.1–0.9) | Minimum detection score to accept a face. | **Lower (e.g. 0.1):** More detections accepted; more false positives. **Higher (e.g. 0.7):** Only high-confidence detections; “no face” more often. | Same idea as Min Confidence for SSD: lower → face-api.js result appears more often; higher → “Could not detect face” more often. |

---

## Summary

- **Melon API (Authenticate result):** Unchanged by these sliders; it always uses the same captured image.
- **face-api.js (second result card):** Uses the chosen detector (SSD or Tiny) and the current **Min Confidence** (SSD) or **Input Size** + **Score Threshold** (Tiny). Changing them only changes whether face-api finds a face and shows distance/similarity; it does not change the Melon “authenticated / not authenticated” outcome.
