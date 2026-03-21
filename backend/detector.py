from ultralytics import YOLO
import cv2
import os

class TrafficDetector:
    def __init__(self, model_path='yolov8n.pt', accident_model_path=None):
        """
        Initializes the YOLOv8 detector for vehicles and an optional accident model.
        """
        self.model = YOLO(model_path)
        
        # Load accident model if path provided
        self.accident_model = None
        if accident_model_path:
            if os.path.exists(accident_model_path):
                self.accident_model = YOLO(accident_model_path)
                print(f"[TRAE] Accident model loaded successfully from {accident_model_path}")
            else:
                print(f"[ERROR] Accident model NOT found at {accident_model_path}")
                raise FileNotFoundError(f"Accident model not found at {accident_model_path}")

        # COCO class IDs: person (0), car (2), motorcycle (3), bus (5), truck (7)
        self.required_classes = {0, 2, 3, 5, 7}
        self.vehicle_classes = {2, 3, 5, 7}
        self.person_classes = {0}
        
        # Colors (BGR)
        self.colors = {
            'vehicle': (0, 255, 0),  # Green
            'person': (255, 0, 0),    # Blue
            'accident': (0, 0, 255)   # Red
        }

    def detect(self, frame, run_accident=False):
        """
        Runs YOLO detection on a single frame.
        Filters for specific classes and optionally runs accident detection.
        """
        # Vehicle & Person Detection
        results = self.model(frame, verbose=False)[0]
        
        vehicle_count = 0
        person_count = 0
        detections = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            if cls_id in self.required_classes:
                conf = float(box.conf[0])
                label = results.names[cls_id]
                coords = box.xyxy[0].tolist()
                
                if cls_id in self.vehicle_classes:
                    category = 'vehicle'
                    vehicle_count += 1
                else:
                    category = 'person'
                    person_count += 1
                
                detections.append({
                    'label': label,
                    'confidence': conf,
                    'coords': [int(c) for c in coords],
                    'category': category
                })

        # Accident Detection (if requested and model loaded)
        accident_info = {"detected": False, "confidence": 0.0, "boxes": []}
        if run_accident and self.accident_model:
            acc_results = self.accident_model(frame, verbose=False)[0]
            for box in acc_results.boxes:
                conf = float(box.conf[0])
                if conf > 0.6:  # Threshold from requirements
                    accident_info["detected"] = True
                    accident_info["confidence"] = max(accident_info["confidence"], conf)
                    accident_info["boxes"].append({
                        'coords': [int(c) for c in box.xyxy[0].tolist()],
                        'confidence': conf
                    })
        
        return detections, vehicle_count, person_count, accident_info

    def draw_detections(self, frame, detections, intelligence_report, incident_report, accident_info=None):
        """
        Draws bounding boxes and overlays count text on the frame.
        """
        # ... (rest of the method remains similar, but add accident drawing)
        location_label = f"Location {intelligence_report['location']}"
        vehicle_count = intelligence_report['vehicle_count']
        person_count = intelligence_report['people_count']
        density = intelligence_report['traffic_density']
        trend = intelligence_report['trend']
        score = intelligence_report['traffic_score']
        congestion = intelligence_report['congestion']
        
        incident = incident_report['incident']
        risk_level = incident_report['risk_level']
        
        trend_arrow = {"increasing": "INC", "decreasing": "DEC", "stable": "STB"}.get(trend, "STB")
        
        status_colors = {
            "LOW": (0, 255, 0), "MEDIUM": (0, 255, 255), "HIGH": (0, 165, 255), "CRITICAL": (0, 0, 255)
        }
        density_color = status_colors.get(density, (255, 255, 255))
        risk_color = status_colors.get(risk_level, (0, 255, 0))
        
        # Draw vehicle/person boxes
        for det in detections:
            x1, y1, x2, y2 = det['coords']
            color = self.colors[det['category']]
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        # Draw Accident boxes
        if accident_info and accident_info["detected"]:
            for acc_box in accident_info["boxes"]:
                x1, y1, x2, y2 = acc_box['coords']
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 4) # Thick Red
                cv2.putText(frame, "ACCIDENT!", (x1, y1 - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        # Top Bar
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 45), (0, 0, 0), -1)
        cv2.putText(frame, f"{location_label} | Score: {score}", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        intel_text = f"Traffic: {density} | Trend: {trend_arrow}"
        if congestion: intel_text += " | CONGESTED!"
        cv2.putText(frame, intel_text, (frame.shape[1] - 400, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, density_color, 2)
        
        # Alerts
        current_incident = incident if not (accident_info and accident_info["detected"]) else "accident"
        if current_incident != "none":
            alert_text = f"ALERT: {current_incident.replace('_', ' ').upper()}! ({risk_level})"
            (w, h), _ = cv2.getTextSize(alert_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
            box_x = (frame.shape[1] - w) // 2
            box_y = frame.shape[0] // 2
            cv2.rectangle(frame, (box_x - 10, box_y - h - 10), (box_x + w + 10, box_y + 10), (0, 0, 0), -1)
            cv2.putText(frame, alert_text, (box_x, box_y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, risk_color, 2)

        # Bottom Bar
        overlay_text = f"Vehicles: {vehicle_count} | People: {person_count} | Risk: {risk_level}"
        cv2.rectangle(frame, (0, frame.shape[0] - 40), (frame.shape[1], frame.shape[0]), (0, 0, 0), -1)
        cv2.putText(frame, overlay_text, (10, frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, risk_color, 2)
        
        return frame
