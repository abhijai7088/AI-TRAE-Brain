import cv2
import time

def get_live_camera(preferred_index=None):
    """
    Attempts to initialize the camera. 
    Checks indices 0, 1, 2 to find a working camera.
    """
    # Order of preference: preferred_index (if provided), then 0, 1, 2
    indices_to_try = []
    if preferred_index is not None:
        indices_to_try.append(preferred_index)
    
    for i in [0, 1, 2]:
        if i not in indices_to_try:
            indices_to_try.append(i)

    for i in indices_to_try:
        print(f"[CAMERA] Attempting to open camera index {i}...")
        # Try both with and without CAP_DSHOW for compatibility
        for api in [cv2.CAP_DSHOW, cv2.CAP_ANY]:
            cap = cv2.VideoCapture(i, api)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret and frame is not None:
                    print(f"[CAMERA] Successfully opened camera index {i} with API {api}")
                    return cap
                cap.release()

    print("[CAMERA] ERROR: No working camera detected on any common index.")
    return None
