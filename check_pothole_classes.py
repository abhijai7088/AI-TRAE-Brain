from ultralytics import YOLO
import os

model_path = r"c:\knowledge\SGU\AI-TRAE_Brain\models\best.pt"
if os.path.exists(model_path):
    model = YOLO(model_path)
    print(f"Classes: {model.names}")
else:
    print("Model not found")
