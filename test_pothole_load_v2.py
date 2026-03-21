from ultralytics import YOLO
import os

model_path = r"c:\knowledge\SGU\AI-TRAE_Brain\models\Yolov8-fintuned-on-potholes.pt\best"
try:
    model = YOLO(model_path)
    print(f"Loaded successfully! Classes: {model.names}")
except Exception as e:
    print(f"Failed to load: {e}")
