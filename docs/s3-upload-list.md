# Files to Upload to S3 for face-api.js (Production)

Upload these so your app can load the face-api script and models from S3.

---

## 1. Script (1 file)

| Local path | Upload to S3 as |
|------------|-----------------|
| `public/face-api.min.js` | `face-api.min.js` (at bucket root or your prefix) |

**Note:** If you don’t have this file, run from repo root: `npm run copy-face-api`

---

## 2. Model weights (18 files)

Upload the whole `public/face-api-weights/` folder and keep the same **relative paths** under a `face-api-weights/` prefix.

| Local path | Upload to S3 as |
|------------|-----------------|
| `public/face-api-weights/age_gender_model-shard1` | `face-api-weights/age_gender_model-shard1` |
| `public/face-api-weights/age_gender_model-weights_manifest.json` | `face-api-weights/age_gender_model-weights_manifest.json` |
| `public/face-api-weights/face_expression_model-shard1` | `face-api-weights/face_expression_model-shard1` |
| `public/face-api-weights/face_expression_model-weights_manifest.json` | `face-api-weights/face_expression_model-weights_manifest.json` |
| `public/face-api-weights/face_landmark_68_model-shard1` | `face-api-weights/face_landmark_68_model-shard1` |
| `public/face-api-weights/face_landmark_68_model-weights_manifest.json` | `face-api-weights/face_landmark_68_model-weights_manifest.json` |
| `public/face-api-weights/face_landmark_68_tiny_model-shard1` | `face-api-weights/face_landmark_68_tiny_model-shard1` |
| `public/face-api-weights/face_landmark_68_tiny_model-weights_manifest.json` | `face-api-weights/face_landmark_68_tiny_model-weights_manifest.json` |
| `public/face-api-weights/face_recognition_model-shard1` | `face-api-weights/face_recognition_model-shard1` |
| `public/face-api-weights/face_recognition_model-shard2` | `face-api-weights/face_recognition_model-shard2` |
| `public/face-api-weights/face_recognition_model-weights_manifest.json` | `face-api-weights/face_recognition_model-weights_manifest.json` |
| `public/face-api-weights/mtcnn_model-shard1` | `face-api-weights/mtcnn_model-shard1` |
| `public/face-api-weights/mtcnn_model-weights_manifest.json` | `face-api-weights/mtcnn_model-weights_manifest.json` |
| `public/face-api-weights/ssd_mobilenetv1_model-shard1` | `face-api-weights/ssd_mobilenetv1_model-shard1` |
| `public/face-api-weights/ssd_mobilenetv1_model-shard2` | `face-api-weights/ssd_mobilenetv1_model-shard2` |
| `public/face-api-weights/ssd_mobilenetv1_model-weights_manifest.json` | `face-api-weights/ssd_mobilenetv1_model-weights_manifest.json` |
| `public/face-api-weights/tiny_face_detector_model-shard1` | `face-api-weights/tiny_face_detector_model-shard1` |
| `public/face-api-weights/tiny_face_detector_model-weights_manifest.json` | `face-api-weights/tiny_face_detector_model-weights_manifest.json` |

---

## S3 layout summary

```
your-bucket/
├── face-api.min.js
└── face-api-weights/
    ├── age_gender_model-shard1
    ├── age_gender_model-weights_manifest.json
    ├── face_expression_model-shard1
    ├── face_expression_model-weights_manifest.json
    ├── face_landmark_68_model-shard1
    ├── face_landmark_68_model-weights_manifest.json
    ├── face_landmark_68_tiny_model-shard1
    ├── face_landmark_68_tiny_model-weights_manifest.json
    ├── face_recognition_model-shard1
    ├── face_recognition_model-shard2
    ├── face_recognition_model-weights_manifest.json
    ├── mtcnn_model-shard1
    ├── mtcnn_model-weights_manifest.json
    ├── ssd_mobilenetv1_model-shard1
    ├── ssd_mobilenetv1_model-shard2
    ├── ssd_mobilenetv1_model-weights_manifest.json
    ├── tiny_face_detector_model-shard1
    └── tiny_face_detector_model-weights_manifest.json
```

**Total: 19 files** (1 script + 18 weight files)

---

## After upload

1. Set **public read** (or use a CloudFront distribution) so the app can load these URLs.
2. If you use a custom base URL (e.g. `https://your-bucket.s3.region.amazonaws.com/` or a CloudFront URL), the app will need to use:
   - Script: `{BASE_URL}face-api.min.js`
   - Models: `{BASE_URL}face-api-weights/`
   Tell me your S3/CloudFront base URL and I can show the exact code changes for production.
