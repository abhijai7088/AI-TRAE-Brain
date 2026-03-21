from ultralytics import YOLO
import os

model_path = r"c:\knowledge\SGU\AI-TRAE_Brain\models\Yolov8-fintuned-on-potholes.pt"
try:
    model = YOLO(model_path)
    print(f"Loaded successfully from folder! Classes: {model.names}")
except Exception as e:
    print(f"Failed to load from folder: {e}")

# Try the 'best' subdirectory
model_path_best = r"c:\knowledge\SGU\AI-TRAE_Brain\models\Yolov8-fintuned-on-potholes.pt\best"
try:
    model = YOLO(model_path_best)
    print(f"Loaded successfully from best folder! Classes: {model.names}")
except Exception as e:
    print(f"Failed to load from best folder: {e}")
