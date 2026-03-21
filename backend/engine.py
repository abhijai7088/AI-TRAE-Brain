import cv2
import json
import time
import os
import base64
import numpy as np
from detector import TrafficDetector
from traffic_analyzer import TrafficAnalyzer
from incident_detector import IncidentDetector
from flow_analyzer import FlowAnalyzer
from main_orchestrator import MainOrchestrator
from prediction_agents.main_prediction_pipeline import TrafficPredictionPipeline
from utils import resize_frame, create_grid_layout, draw_fps, calculate_fps, draw_global_ui

class UrbanPulseEngine:
    def __init__(self, model_path=None, accident_model_path=None):
        # Determine absolute paths relative to this script
        base_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(base_dir)
        models_dir = os.path.join(project_root, "models")
        
        # Use provided paths or fall back to defaults
        final_model_path = model_path if model_path else os.path.join(models_dir, "yolov8n.pt")
        final_accident_path = accident_model_path if accident_model_path else os.path.join(models_dir, "best.pt")
        
        self.detector = TrafficDetector(model_path=final_model_path, accident_model_path=final_accident_path)
        self.analyzer = TrafficAnalyzer(buffer_size=15)
        self.incident_detector = IncidentDetector(buffer_size=20)
        self.flow_analyzer = FlowAnalyzer()
        self.orchestrator = MainOrchestrator()
        self.prediction_pipeline = TrafficPredictionPipeline(avg_speed=30)
        self.is_running = False
        self.log_dir = "system_logs"
        self.agent_interval = 30  # Run TRAE agents every 30 frames
        
        # Traffic Signal State Machine State
        self.signal_states = {
            'A': {"state": "RED", "time_remaining": 30},
            'B': {"state": "GREEN", "time_remaining": 30},
            'C': {"state": "RED", "time_remaining": 30}
        }
        
        self.last_trae_decision = {
            "reasoning": [], "signals": {"A": 30, "B": 30, "C": 30}, 
            "signal_actions": {"A": "normal", "B": "normal", "C": "normal"}, 
            "alerts": [], "reasons": {}, "emergency": False
        }
        self.last_flow_report = {"flow_direction": "stable", "predicted_congestion": []}
        self.run_history = []
        os.makedirs(self.log_dir, exist_ok=True)

    def update_signal_state_machine(self, target_signals, emergency=False):
        """
        Smoothly transition signal states: RED -> YELLOW -> GREEN
        """
        for loc in ['A', 'B', 'C']:
            current = self.signal_states[loc]
            target_time = target_signals.get(loc, 30)
            
            # If emergency override
            if emergency and target_time > 0:
                self.signal_states[loc] = {"state": "GREEN", "time_remaining": target_time}
                continue
            elif emergency and target_time == 0:
                self.signal_states[loc] = {"state": "RED", "time_remaining": 0}
                continue

            # Normal State Machine Transitions
            if target_time > 0:
                if current["state"] == "RED":
                    self.signal_states[loc] = {"state": "YELLOW", "time_remaining": 3}
                elif current["state"] == "YELLOW":
                    if current["time_remaining"] <= 0:
                        self.signal_states[loc] = {"state": "GREEN", "time_remaining": target_time}
                    else:
                        self.signal_states[loc]["time_remaining"] -= 1
                else: # GREEN
                    self.signal_states[loc]["time_remaining"] = max(0, current["time_remaining"] - 1)
            else:
                self.signal_states[loc] = {"state": "RED", "time_remaining": 0}

    def process_videos(self, video_paths, scenario_callback, update_callback):
        """
        Headless processing loop for uploaded videos.
        """
        print(f"Engine: Starting processing for {video_paths}")
        caps = {loc: cv2.VideoCapture(path) for loc, path in video_paths.items()}
        
        # Check if all videos opened
        for loc, cap in caps.items():
            if not cap.isOpened():
                print(f"Engine Error: Could not open video for {loc}")
                return

        start_time = time.time()
        frame_count = 0
        self.is_running = True

        try:
            while self.is_running:
                processed_frames = {}
                cam_intel = {}
                cam_incidents = {}
                accident_data = {"cam_B": False, "confidence": 0.0}
                frame_count += 1
                
                current_scenario = scenario_callback()
                
                for loc, cap in caps.items():
                    ret, frame = cap.read()
                    if not ret:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = cap.read()
                    
                    frame = resize_frame(frame, 640, 480)
                    
                    # Run Accident Detection ONLY on Cam B
                    run_accident = (loc == 'B')
                    detections, v_count, p_count, accident_info = self.detector.detect(frame, run_accident=run_accident)
                    
                    if loc == 'B':
                        accident_data["cam_B"] = accident_info["detected"]
                        accident_data["confidence"] = accident_info["confidence"]
                    
                    # Scenario Injection for Congestion
                    if current_scenario == "congestion" and loc == "A":
                        v_count += 50
                    
                    intelligence_report = self.analyzer.update(loc, v_count, p_count)
                    cam_intel[loc] = intelligence_report
                    
                    motion_score = self.incident_detector.compute_motion(loc, frame)
                    incident_report = self.incident_detector.detect_incidents(loc, detections, motion_score, v_count, p_count, accident_info)
                    
                    # Scenario Injection for Accident (Manual fallback)
                    if current_scenario == "accident" and loc == "B":
                        incident_report['incident'] = "accident"
                        incident_report['risk_level'] = "CRITICAL"
                        accident_data["cam_B"] = True
                        accident_data["confidence"] = 0.95
                    
                    cam_incidents[loc] = incident_report
                    processed_frame = self.detector.draw_detections(frame, detections, intelligence_report, incident_report, accident_info)
                    processed_frames[loc] = processed_frame

                # Update Signal State Machine every frame
                self.update_signal_state_machine(self.last_trae_decision["signals"], self.last_trae_decision["emergency"])

                # Run TRAE agents
                if frame_count == 1 or frame_count % self.agent_interval == 0:
                    try:
                        flow_report = self.flow_analyzer.analyze_flow(cam_intel, cam_incidents)
                        trae_decision = self.orchestrator.run(cam_intel, cam_incidents, flow_report)
                        
                        # Integration with Signal actions from execution agent
                        self.last_trae_decision = trae_decision
                        self.last_flow_report = flow_report
                        
                        # Add to history
                        history_entry = {
                            "frame_index": frame_count,
                            "timestamp": time.time(),
                            "trae_decision": trae_decision,
                            "cam_intel": cam_intel,
                            "accident": accident_data
                        }
                        self.run_history.append(history_entry)
                    except Exception as e:
                        print(f"Engine Error in TRAE agents: {e}")

                # Use cached data
                current_trae_decision = self.last_trae_decision
                current_flow_report = self.last_flow_report

                grid_frame = create_grid_layout(processed_frames['A'], processed_frames['B'], processed_frames['C'])
                grid_frame = draw_global_ui(grid_frame, current_flow_report, current_trae_decision)
                
                current_fps = calculate_fps(start_time, frame_count)
                grid_frame = draw_fps(grid_frame, current_fps)
                
                _, buffer = cv2.imencode('.jpg', grid_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
                frame_b64 = base64.b64encode(buffer).decode('utf-8')
                
                # Push structured update for UI
                payload = {
                    "run_id": f"traffic_{int(start_time)}",
                    "dashboard": "traffic_monitoring",
                    "status": "running",
                    "traffic": {loc: intel["vehicle_count"] for loc, intel in cam_intel.items()},
                    "accident": accident_data,
                    "signals": self.signal_states,
                    "trae_agent": {
                        "agent": "TRAFFIC_AGENT",
                        "decision": current_trae_decision["summary"]["decisions"][-1] if current_trae_decision["summary"]["decisions"] else "NORMAL_BALANCE",
                        "reason": current_trae_decision["reasons"].get('B', "Normal Operations") if accident_data["cam_B"] else "Density optimized"
                    },
                    "logs": current_trae_decision.get("reasoning", []),
                    "alerts": current_trae_decision.get("alerts", []),
                    "emergency": current_trae_decision.get("emergency", False),
                    "frame_b64": frame_b64
                }
                
                update_callback(payload)
                time.sleep(0.001)

        finally:
            for cap in caps.values():
                cap.release()
            self.save_run_summary()
            print("Engine: Stopped.")

    def stop(self):
        self.is_running = False

    def reset_state(self):
        """
        Resets the internal state of all analyzers and detectors.
        """
        self.analyzer = TrafficAnalyzer(buffer_size=15)
        self.incident_detector = IncidentDetector(buffer_size=20)
        self.flow_analyzer = FlowAnalyzer()
        self.orchestrator = MainOrchestrator()
        print("Engine: State reset.")
