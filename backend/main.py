import cv2
import json
import time
import os
import base64
import requests
from detector import TrafficDetector
from traffic_analyzer import TrafficAnalyzer
from incident_detector import IncidentDetector
from flow_analyzer import FlowAnalyzer
from main_orchestrator import MainOrchestrator
from utils import resize_frame, create_grid_layout, draw_fps, calculate_fps, draw_global_ui

def push_to_dashboard(grid_frame, cam_intel, cam_incidents, flow_report, trae_decision):
    """
    Pushes current frame and intelligence data to the FastAPI backend.
    """
    try:
        # Encode frame as base64
        _, buffer = cv2.imencode('.jpg', grid_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        frame_b64 = base64.b64encode(buffer).decode('utf-8')
        
        # Prepare payload
        payload = {
            "logs": trae_decision.get("reasoning", []),
            "signals": trae_decision.get("signals", {}),
            "signal_actions": trae_decision.get("signal_actions", {}),
            "alerts": trae_decision.get("alerts", []),
            "camera_data": {
                "flow_direction": flow_report.get("flow_direction", "stable"),
                "predicted_congestion": flow_report.get("predicted_congestion", [])
            },
            "emergency": trae_decision.get("emergency", False),
            "frame_b64": frame_b64
        }
        
        # Send to backend
        requests.post("http://localhost:8000/update", json=payload, timeout=0.1)
    except Exception as e:
        # Silently fail if dashboard is not running
        pass

def get_current_scenario():
    """
    Polls the backend for the current demo scenario.
    """
    try:
        r = requests.get("http://localhost:8000/scenario", timeout=0.1)
        return r.json().get("scenario", "normal")
    except:
        return "normal"

def main():
    """
    Main entry point for UrbanPulse AI: Multi-Node Traffic & Safety Intelligence System.
    Phase 5: Real-Time Dashboard & Demo Integration.
    """
    print("--- UrbanPulse AI: Multi-Node Traffic & Safety Intelligence System ---")
    print("Phase 5: Initializing Dashboard-Ready System...")

    # Configuration
    video_sources = {
        'A': '../demo_videos/cam1.mp4',
        'B': '../demo_videos/cam2.mp4',
        'C': '../demo_videos/cam3.mp4'
    }
    
    # Initialize components
    detector = TrafficDetector(model_path='../models/yolov8n.pt')
    analyzer = TrafficAnalyzer(buffer_size=15)
    incident_detector = IncidentDetector(buffer_size=20)
    flow_analyzer = FlowAnalyzer()
    orchestrator = MainOrchestrator()
    
    # Initialize video captures
    caps = {}
    for loc, path in video_sources.items():
        if not os.path.exists(path):
            print(f"Error: {path} not found. Please provide video files in the root directory.")
            # Fallback for demonstration if no file exists
            # Using camera 0 for one of them if path is missing
            # caps[loc] = cv2.VideoCapture(0)
            # print(f"Warning: Using webcam for Location {loc} as fallback.")
            return # In real hackathon scenario, return or handle error
        else:
            caps[loc] = cv2.VideoCapture(path)
            print(f"Successfully loaded video for Location {loc} ({path})")

    # Display Window
    window_name = "UrbanPulse AI - Multi-Node Traffic Intelligence"
    try:
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    except cv2.error as e:
        if "The function is not implemented" in str(e):
            print("\n🚨 CRITICAL ERROR: OpenCV GUI support is missing.")
            print("This usually happens if 'opencv-python-headless' is installed instead of 'opencv-python'.")
            print("\nFIX THIS BY RUNNING:")
            print("pip uninstall opencv-python opencv-python-headless opencv-contrib-python -y")
            print("pip install opencv-python")
            return
        else:
            raise e

    # Frame timing
    start_time = time.time()
    frame_count = 0

    try:
        while True:
            processed_frames = {}
            cam_intel = {}
            cam_incidents = {}
            frame_count += 1
            
            # Process each camera node
            current_scenario = get_current_scenario()
            
            for loc, cap in caps.items():
                ret, frame = cap.read()
                
                # If video ends, loop back to beginning
                if not ret:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = cap.read()
                
                # Resize for efficiency and grid consistency
                frame = resize_frame(frame, 640, 480)
                
                # Run YOLO Detection
                detections, v_count, p_count = detector.detect(frame)
                
                # --- PHASE 5: Demo Scenario Simulation ---
                # Inject artificial data to trigger TRAE reasoning if needed
                if current_scenario == "congestion" and loc == "A":
                    v_count += 50 # Force high traffic at A
                elif current_scenario == "accident" and loc == "A":
                    # Force accident incident at A
                    incident_report = {
                        "location": "A",
                        "incident": "accident",
                        "confidence": 0.9,
                        "risk_level": "CRITICAL"
                    }
                # ------------------------------------------

                # Phase 2: Traffic Intelligence Analysis
                intelligence_report = analyzer.update(loc, v_count, p_count)
                cam_intel[loc] = intelligence_report
                
                # Phase 3: Incident Detection
                motion_score = incident_detector.compute_motion(loc, frame)
                
                # Only use incident detector if not manually overridden by scenario
                if current_scenario == "accident" and loc == "A":
                    # Keep our manual incident report
                    pass
                else:
                    incident_report = incident_detector.detect_incidents(loc, detections, motion_score, v_count, p_count)
                
                cam_incidents[loc] = incident_report
                
                # Draw detections, intelligence, and incidents on frame
                processed_frame = detector.draw_detections(frame, detections, intelligence_report, incident_report)
                processed_frames[loc] = processed_frame

                # Phase 3: Per-camera Console Logging (Structured JSON)
                cam_log = {
                    "location": loc,
                    "incident": incident_report["incident"],
                    "risk_level": incident_report["risk_level"],
                    "density": intelligence_report["traffic_density"]
                }
                # Optional: print(json.dumps(cam_log))

            # Phase 3: Flow Intelligence (Inter-camera)
            flow_report = flow_analyzer.analyze_flow(cam_intel, cam_incidents)
            
            # Phase 4: TRAE Multi-Agent Orchestration
            trae_decision = orchestrator.run(cam_intel, cam_incidents, flow_report)
            
            # Combine frames into a grid layout
            grid_frame = create_grid_layout(
                processed_frames['A'], 
                processed_frames['B'], 
                processed_frames['C']
            )
            
            # Draw Global UI (Flow arrows, alerts, signals, reasoning logs)
            grid_frame = draw_global_ui(grid_frame, flow_report, trae_decision)
            
            # Draw FPS
            current_fps = calculate_fps(start_time, frame_count)
            grid_frame = draw_fps(grid_frame, current_fps)
            
            # --- PHASE 5: Push to Dashboard ---
            push_to_dashboard(grid_frame, cam_intel, cam_incidents, flow_report, trae_decision)
            
            # Show the final display
            cv2.imshow(window_name, grid_frame)
            
            # Press 'q' to quit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except KeyboardInterrupt:
        print("\nSystem Interrupted by User.")
    finally:
        # Cleanup
        for cap in caps.values():
            cap.release()
        cv2.destroyAllWindows()
        print("System shutdown complete.")

if __name__ == "__main__":
    main()
