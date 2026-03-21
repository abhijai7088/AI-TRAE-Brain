from ultralytics import YOLO
import os

model_path = r"c:\knowledge\SGU\AI-TRAE_Brain\models\best.pt"
try:
    model = YOLO(model_path)
    print(f"Model Path: {model_path}")
    print(f"Classes: {model.names}")
except Exception as e:
    print(f"Error: {e}")
