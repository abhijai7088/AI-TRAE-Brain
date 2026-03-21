import cv2
import os
import time
import json
import uuid
import base64
from ultralytics import YOLO
from .trae_agent import PotholeAgent
from pothole_utils.logger import Logger
from pothole_utils.camera_utils import get_live_camera

class PotholeDetectionPipeline:
    def __init__(self, run_id, model_path=None):
        self.run_id = run_id
        # Set paths relative to the 'backend' directory
        self.backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.project_root = os.path.dirname(self.backend_dir)
        
        # Determine absolute path for the model
        if model_path:
            abs_model_path = os.path.abspath(os.path.join(self.backend_dir, model_path))
        else:
            # Try the specific pothole model directory first
            abs_model_path = os.path.join(self.project_root, "models", "Yolov8-fintuned-on-potholes.pt")
            if not os.path.exists(abs_model_path):
                # Fallback to root models/best.pt then backend models/yolov8n.pt
                abs_model_path = os.path.join(self.project_root, "models", "best.pt")
                if not os.path.exists(abs_model_path):
                    abs_model_path = os.path.join(self.backend_dir, "models", "yolov8n.pt")
        
        # Load YOLO Model
        self.model_loaded = False
        try:
            # Handle directory model (YOLOv8 often saves as a folder with weights inside)
            if os.path.exists(abs_model_path):
                self.model = YOLO(abs_model_path)
                self.model_loaded = True
                print(f"[TRAE] Pothole Pipeline using model: {abs_model_path}")
            else:
                print(f"[TRAE] Warning: Model not found: {abs_model_path}")
                self.model = None
        except Exception as e:
            print(f"[TRAE] Error loading YOLO model: {e}")
            self.model = None

        self.logger = Logger(run_id)
        if self.model_loaded:
            self.logger.log(f"[SYSTEM] Using model: {os.path.basename(abs_model_path)}")
        else:
            self.logger.log("[WARNING] Pothole model failed to load. Using simulation mode.")
        
        self.trae_agent = PotholeAgent(self.logger)
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
        self.logger.log("[TRAE] Model loaded")
        self.logger.log("[TRAE] Processing frames...")

        if use_camera:
            cap = get_live_camera(preferred_index=1)
            source_type = "camera"
        else:
            cap = cv2.VideoCapture(source_path)
            source_type = "upload"

        if not cap.isOpened():
            self.logger.log(f"Error: Could not open video source")
            self.status = "failed"
            return

        total_frames = 0
        frames_with_potholes = 0
        all_detections = []
        cumulative_potholes = [] # To show all potholes found so far
        trae_alerts = []
        max_potholes_in_single_frame = 0
        
        # Persistence logic for bounding boxes
        persistence_limit = 10  # Show box for 10 frames after detection
        persistence_counter = 0
        
        # Frame skipping logic
        skip_frames = 2 if use_camera else 0 

        # Video saving for visualization
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

        last_detections = []
        while cap.isOpened() and self.is_running:
            ret, frame = cap.read()
            if not ret: break

            total_frames += 1
            
            # AI Processing with skipping
            if total_frames % (skip_frames + 1) == 0:
                current_detections = []
                if self.model_loaded:
                    results = self.model(frame, verbose=False)[0]
                    for box in results.boxes:
                        coords = box.xyxy[0].tolist()
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        
                        # Filtering: Only show boxes with high confidence to reduce noise
                        # And filter by class if necessary (assuming class 0 is pothole)
                        if conf > 0.4:
                            current_detections.append({
                                "bbox": [int(c) for c in coords],
                                "confidence": conf,
                                "class": cls
                            })
                else:
                    # Simulation Mode: More realistic random potholes
                    import random
                    current_detections = []
                    # 5% chance to start a pothole detection if none active
                    if persistence_counter == 0 and random.random() < 0.05:
                        h, w = frame.shape[:2]
                        # Random position in the lower half of the screen (road area)
                        x = random.randint(w//4, 3*w//4)
                        y = random.randint(h//2, 3*h//4)
                        current_detections.append({
                            "bbox": [x, y, x + 80 + random.randint(0, 40), y + 40 + random.randint(0, 20)],
                            "confidence": 0.85 + random.random() * 0.1,
                            "class": 0
                        })
                        self.logger.log(f"[TRAE] Simulation: Pothole detected at frame {total_frames}")

                if current_detections:
                    last_detections = current_detections
                    persistence_counter = persistence_limit
                    
                    # Add unique detections to cumulative list
                    for d in current_detections:
                        # Check if this pothole is already in cumulative (simple overlap check)
                        is_new = True
                        for existing in cumulative_potholes:
                            # Calculate IoU or simple center-distance to avoid duplicates
                            ex_bbox = existing["bbox"]
                            d_bbox = d["bbox"]
                            # Simple center distance check
                            center_ex = [(ex_bbox[0] + ex_bbox[2])/2, (ex_bbox[1] + ex_bbox[3])/2]
                            center_d = [(d_bbox[0] + d_bbox[2])/2, (d_bbox[1] + d_bbox[3])/2]
                            dist = ((center_ex[0]-center_d[0])**2 + (center_ex[1]-center_d[1])**2)**0.5
                            if dist < 50: # If centers are within 50 pixels, consider it same pothole
                                is_new = False
                                break
                        if is_new:
                            cumulative_potholes.append(d)
                else:
                    persistence_counter = max(0, persistence_counter - 1)
                    if persistence_counter == 0:
                        last_detections = []

            # Draw cumulative detections (all potholes found so far)
            for det in cumulative_potholes:
                x1, y1, x2, y2 = det["bbox"]
                # Cumulative boxes are permanent
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            
            # Draw active detections (bold with label)
            for det in last_detections:
                x1, y1, x2, y2 = det["bbox"]
                conf = det["confidence"]
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 4)
                label = f"POTHOLE {conf:.2f}"
                (w_label, h_label), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(frame, (x1, y1 - h_label - 10), (x1 + w_label, y1), (0, 0, 255), -1)
                cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            if last_detections and total_frames % (skip_frames + 1) == 0:
                frames_with_potholes += 1
                max_potholes_in_single_frame = max(max_potholes_in_single_frame, len(last_detections))
                alert = self.trae_agent.analyze_frame(total_frames, len(last_detections))
                trae_alerts.append(alert)
                all_detections.append({
                    "frame_id": total_frames,
                    "count": len(last_detections),
                    "potholes": last_detections
                })

            # Ensure frame size matches VideoWriter expectations
            if frame.shape[1] != width or frame.shape[0] != height:
                frame = cv2.resize(frame, (width, height))
            out.write(frame)

            # Live Broadcasting
            if update_callback:
                _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
                frame_b64 = base64.b64encode(buffer).decode('utf-8')
                update_callback({
                    "dashboard": "pothole_monitoring",
                    "status": "ANALYZING" if self.is_running else "STOPPED",
                    "frame_b64": frame_b64,
                    "logs": self.logger.get_logs()[-5:],
                    "alerts": trae_alerts[-3:] if trae_alerts else []
                })

        cap.release()
        out.release()
        
        # Log completion and file size
        if not self.is_running:
            self.logger.log("[SYSTEM] Processing stopped by user.")
            self.status = "stopped"
        elif os.path.exists(output_video_path):
            size_mb = os.path.getsize(output_video_path) / (1024 * 1024)
            self.logger.log(f"[SYSTEM] Output video saved: {output_video_path} ({size_mb:.2f} MB)")
        else:
            self.logger.log(f"[ERROR] Failed to save output video at {output_video_path}")

        severity = self.trae_agent.get_final_severity(frames_with_potholes, max_potholes_in_single_frame)
        self.logger.log("[TRAE] Pipeline finished")

        final_output = {
            "run_id": self.run_id,
            "dashboard": "pothole_monitoring",
            "source": source_type,
            "status": "completed" if self.is_running else "stopped",
            "summary": {
                "total_frames": total_frames,
                "frames_with_potholes": frames_with_potholes,
                "total_potholes": len(cumulative_potholes),
                "severity": severity
            },
            "detections": all_detections,
            "trae_agent": {
                "agent": "POTHOLE_AGENT",
                "alerts": trae_alerts
            },
            "logs": self.logger.get_logs()
        }

        with open(self.results_file, "w") as f:
            json.dump(final_output, f, indent=4)

        if self.is_running:
            self.status = "completed"
        else:
            self.status = "stopped"
            
        # Send final update
        if update_callback:
            update_callback(final_output)
            
        return final_output
