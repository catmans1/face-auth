# Face-API Working Version Note

**This version of the code works fine.** Stored in this md file for reference.

- **Script:** Loaded from project only (no CDN).
  - **Localhost:** `face-api.js-master/dist/face-api.min.js`
  - **Production:** `https://assets-stg.share-wis.com/faceapi/face-api.min.js`
- **Weights:** From project only (no CDN).
  - **Localhost:** `face-api.js-master/weights` or `public/face-api-weights`
  - **Production:** `https://assets-stg.share-wis.com/faceapi/` (e.g. `face_recognition_model-weights_manifest.json` at same path)
- **Example:** `examples/face-comparison/` uses the above paths; API version dropdown is hidden; registration with upload does not block on face-api validation; Authenticate button stays enabled when user is registered (v3) or device registered (v2) regardless of face descriptor.

*Last noted: 2026-02-06*
