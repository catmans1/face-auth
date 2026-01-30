# Face Comparison & Authentication Flows

This document details the operational flows for the two face comparison examples provided in this repository.

## 1. Local Comparison (`examples/face-comparison-local`)

This example performs face verification entirely on the client-side (in the browser) without sending any image data to a server.

### Flow Overview

1.  **Reference Image Setup**:
    *   User uploads an image.
    *   `MediaPipeFaceDetector` detects faces in the image.
    *   If a face is found, its **landmarks** (keypoints) are extracted and stored in memory.

2.  **Webcam Detection Loop**:
    *   The webcam stream is continuously analyzed by `MediaPipeFaceDetector`.
    *   For every frame, face landmarks are extracted.

3.  **Comparison Logic**:
    *   The application calculates the **Euclidean distance** between the normalized landmarks of the *Reference Face* and the *Webcam Face*.
    *   **Normalization**: Coordinates are normalized relative to the face bounding box to account for differences in distance/zoom.
    *   **Similarity Score**: The average distance is converted into a similarity score (0% - 100%).

4.  **Result**:
    *   If the similarity score exceeds the `SIMILARITY_THRESHOLD` (default 0.4), it is a **Match**.
    *   Otherwise, it is a **No Match**.

---

## 2. Melon API Comparison (`examples/face-comparison`)

This example demonstrates a production-grade flow using the Melon Facial Recognition API. It involves server-side processing for secure registration and authentication.

### Phase 1: Registration (User Onboarding)

1.  **Create User**:
    *   App calls `POST /v2/users` with a display name.
    *   Server returns a `user_uuid`.

2.  **Register Face**:
    *   App captures an image from the webcam.
    *   App calls `PUT /v2/users/{user_uuid}/face` with the image blob.
    *   Server extracts and stores the face vector.

3.  **Create Ticket (Token)**:
    *   App calls `POST /v2/users/{user_uuid}/tokens` to define validity period and metadata (e.g., gallery name).
    *   *Note: This links the user to a specific context (gallery).*

### Phase 2: Device Setup (One-time)

1.  **Register Device**:
    *   App calls `POST /v2/devices` with a display name and metadata (linked to the same **gallery** as the user).
    *   Server returns a `device_uuid`.

2.  **Issue Device Key**:
    *   App calls `POST /v2/devices/{device_uuid}/keys`.
    *   Server returns a `keyId` and `secretKey`.
    *   **Important**: These credentials are saved locally (e.g., `localStorage`) to authenticate future Match requests.

### Phase 3: Authentication (Daily Use)

1.  **Capture**:
    *   User stands in front of the camera (Authentication tab).
    *   App captures a frame.

2.  **Match Request**:
    *   App generates a JWT using the **Device Key** and **Secret Key**.
    *   App calls `POST /v2/match` with the captured image.

3.  **Server Processing**:
    *   The API identifies the device making the request.
    *   It looks up the **gallery** associated with that device.
    *   It compares the uploaded face against all users registered in that specific gallery.

4.  **Result**:
    *   Server returns a list of matching users with `score` (confidence).
    *   If the top match score > threshold (e.g., 0.5), the user is **Authenticated**.
