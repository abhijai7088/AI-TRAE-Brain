import cv2
import os
import time
import json
import torch
import numpy as np
import base64
import torchvision.models.video as video_models
import albumentations as A
from ultralytics import YOLO
from .suspicious_trae_agent import SuspiciousAgent
from pothole_utils.logger import Logger
from pothole_utils.camera_utils import get_live_camera

class SuspiciousDetectionPipeline:
    def __init__(self, run_id, fight_model_path="models/fight_model.pth", yolo_path="models/yolov8n.pt"):
        self.run_id = run_id
        # Set paths relative to the 'backend' directory
        self.backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        # Absolute paths
        abs_fight_path = os.path.abspath(os.path.join(self.backend_dir, fight_model_path))
        abs_yolo_path = os.path.abspath(os.path.join(self.backend_dir, yolo_path))
        
        print(f"[DEBUG] Fight Model Absolute Path: {abs_fight_path}")
        print(f"[DEBUG] YOLO Model Absolute Path: {abs_yolo_path}")
        
        # If YOLOv8n doesn't exist in backend/models, look in project root/models
        if not os.path.exists(abs_yolo_path):
            abs_yolo_path = os.path.join(os.path.dirname(self.backend_dir), "models", "yolov8n.pt")
        
        self.logger = Logger(run_id)
        
        # Define Preprocessing Transform (from provided model info)
        self.transform = A.Compose([ 
            A.Resize(128, 171, always_apply=True), 
            A.CenterCrop(112, 112, always_apply=True), 
            A.Normalize(mean=[0.43216, 0.394666, 0.37645], std=[0.22803, 0.22145, 0.216989], always_apply=True) 
        ])

        # Load Fight Model
        self.model_loaded = False
        try:
            if os.path.exists(abs_fight_path):
                self.logger.log(f"[TRAE] Attempting to load MC3_18 fight model (v2) from: {abs_fight_path}")
                # Load pre-trained MC3_18 model (architecture from torchvision)
                # Note: Using weights=None as we load fine-tuned weights
                self.fight_model = video_models.mc3_18(weights=None)
                
                # Modify the final layer for 2 classes (fight/noFight)
                num_features = self.fight_model.fc.in_features
                self.fight_model.fc = torch.nn.Linear(num_features, 2)
                
                # Load fine-tuned weights
                try:
                    state_dict = torch.load(abs_fight_path, map_location=torch.device('cpu'))
                    self.fight_model.load_state_dict(state_dict)
                    self.fight_model.eval()
                    self.model_loaded = True
                    self.logger.log("[TRAE] Fight model loaded successfully (MC3_18 with modified FC)")
                except Exception as e:
                    self.model_loaded = False
                    self.logger.log(f"[ERROR] State dict loading failed: {e}")
                    self.logger.log("[WARNING] Using simulation mode")
                    self.fight_model = None
            else:
                self.logger.log(f"[WARNING] Fight model not found at {abs_fight_path}. Using simulation mode.")
                self.fight_model = None
        except Exception as e:
            self.model_loaded = False
            self.logger.log(f"[ERROR] Critical failure in model loading: {e}. Using simulation mode.")
            self.fight_model = None

        # Load YOLO Model (Person Detection)
        try:
            self.yolo = YOLO(abs_yolo_path)
            self.logger.log("[TRAE] YOLO model loaded")
        except Exception as e:
            self.logger.log(f"[ERROR] Could not load YOLO model: {e}")
            self.yolo = None

        self.trae_agent = SuspiciousAgent(self.logger)
        self.output_dir = os.path.join(self.backend_dir, "workdir", run_id)
        os.makedirs(self.output_dir, exist_ok=True)
        self.results_file = os.path.join(self.output_dir, "results.json")
        self.status = "initializing"
        self.is_running = False

    def stop(self):
        self.is_running = False
        self.logger.log("[SYSTEM] Stop signal received.")

    def process(self, source_path=None, use_camera=False, update_callback=None):
        self.status = "started"
        self.is_running = True
        self.logger.log("[TRAE] Pipeline started")
        self.logger.log("[TRAE] Processing frames...")

        if use_camera:
            cap = get_live_camera(preferred_index=1)
            source_type = "camera"
        else:
            cap = cv2.VideoCapture(source_path)
            source_type = "upload"

        if not cap.isOpened():
            self.logger.log(f"[ERROR] Could not open video source")
            self.status = "failed"
            return

        total_frames = 0
        fight_detected_global = False
        max_people_count = 0
        overcrowded_frames = 0
        all_detections = []
        trae_alerts = []
        
        # Frame skipping logic for performance
        # skip_frames = 2 if use_camera else 0 
        # Optimized skipping: YOLO every 3 frames, Fight model every 15 frames
        yolo_skip = 3 if use_camera else 1
        fight_skip = 15 if use_camera else 5

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        output_video_path = os.path.join(self.output_dir, "output.mp4")
        
        try:
            fourcc = cv2.VideoWriter_fourcc(*'avc1')
            out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
            if not out.isOpened(): raise Exception()
        except:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

        last_people_boxes = []
        last_people_count = 0
        last_is_fight = False
        last_fight_prob = 0.0
        frame_buffer = []

        while cap.isOpened() and self.is_running:
            ret, frame = cap.read()
            if not ret: break

            total_frames += 1
            
            # 1. Light Processing: YOLO (Person Detection) & Buffer Management
            if total_frames % yolo_skip == 0:
                last_people_count = 0
                last_people_boxes = []
                if self.yolo:
                    results = self.yolo(frame, verbose=False)[0]
                    for box in results.boxes:
                        cls = int(box.cls[0])
                        if results.names[cls] == 'person':
                            last_people_count += 1
                            last_people_boxes.append([int(c) for c in box.xyxy[0].tolist()])

                max_people_count = max(max_people_count, last_people_count)
                overcrowded = last_people_count > 20
                if overcrowded: overcrowded_frames += 1

                # Update temporal buffer for fight model
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_processed = self.transform(image=frame_rgb)['image']
                frame_buffer.append(frame_processed)
                if len(frame_buffer) > 16:
                    frame_buffer.pop(0)

            # 2. Heavy Processing: Fight Detection (3D Video Model)
            if total_frames % fight_skip == 0:
                last_fight_prob = 0.0
                if self.model_loaded and len(frame_buffer) == 16:
                    try:
                        # Prepare input: [1, 3, 16, 112, 112]
                        input_frames = np.array(frame_buffer)
                        input_frames = np.expand_dims(input_frames, axis=0)
                        input_frames = np.transpose(input_frames, (0, 4, 1, 2, 3))
                        input_tensor = torch.tensor(input_frames, dtype=torch.float32)
                        
                        with torch.no_grad():
                            outputs = self.fight_model(input_tensor)
                            probabilities = torch.softmax(outputs, dim=1)
                            last_fight_prob = float(probabilities[0][1])
                    except Exception as e:
                        self.logger.log(f"[ERROR] Inference failed: {e}")
                elif not self.model_loaded:
                    if total_frames % 200 == 0:
                        last_fight_prob = 0.85
                        self.logger.log("[TRAE] Simulation fallback triggered")
                
                # Update Detection State
                last_is_fight = last_fight_prob > 0.7
                if last_is_fight: 
                    fight_detected_global = True
                    self.logger.log(f"[TRAE] Fight detected at frame {total_frames}")

                # 3. TRAE Analysis & Alerting
                if last_is_fight or (total_frames % yolo_skip == 0 and overcrowded):
                    alert = self.trae_agent.analyze_frame(total_frames, last_is_fight, last_people_count, overcrowded)
                    trae_alerts.append(alert)
                    all_detections.append({
                        "frame_id": total_frames,
                        "event": "fight" if last_is_fight else "overcrowding",
                        "confidence": float(last_fight_prob) if last_is_fight else 1.0,
                        "people_count": last_people_count
                    })

            # Visualization (always draw boxes using last known state)
            box_color = (0, 0, 255) if last_is_fight else (0, 255, 0)
            for box in last_people_boxes:
                cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), box_color, 2)

            if last_is_fight or (total_frames % 10 < 5 and fight_detected_global): 
                label = "!! FIGHT DETECTED !!" if last_is_fight else "!! THREAT ACTIVE !!"
                cv2.putText(frame, label, (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

            cv2.putText(frame, f"People: {last_people_count}", (width - 200, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            out.write(frame)

            # Live Broadcasting
            if update_callback:
                _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
                frame_b64 = base64.b64encode(buffer).decode('utf-8')
                update_callback({
                    "dashboard": "suspicious_monitoring",
                    "frame_b64": frame_b64,
                    "logs": self.logger.get_logs()[-5:],
                    "alerts": trae_alerts[-3:] if trae_alerts else [],
                    "people_count": last_people_count
                })

        cap.release()
        out.release()

        # Final inference: Protest if overcrowding persists
        protest_inferred = overcrowded_frames > (total_frames * 0.3) # 30% of video
        if protest_inferred:
            self.logger.log("[TRAE] Event classified as PROTEST due to sustained overcrowding")

        event, severity = self.trae_agent.get_final_classification(fight_detected_global, max_people_count, protest_inferred)
        self.logger.log("[TRAE] Pipeline completed")

        final_output = {
            "run_id": self.run_id,
            "dashboard": "suspicious_monitoring",
            "source": source_type,
            "status": "completed",
            "summary": {
                "total_frames": total_frames,
                "fight_detected": fight_detected_global,
                "max_people_count": max_people_count,
                "event": event,
                "severity": severity
            },
            "detections": all_detections,
            "trae_agent": {
                "agent": "SUSPICIOUS_AGENT",
                "alerts": trae_alerts
            },
            "logs": self.logger.get_logs()
        }

        with open(self.results_file, "w") as f:
            json.dump(final_output, f, indent=4)

        self.status = "completed"
        return final_output
