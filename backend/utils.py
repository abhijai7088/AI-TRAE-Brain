import cv2
import numpy as np
import time

def resize_frame(frame, target_width=640, target_height=480):
    """
    Resizes a frame to the target dimensions.
    """
    return cv2.resize(frame, (target_width, target_height))

def create_grid_layout(frame_a, frame_b, frame_c):
    """
    Creates a 2x2 grid layout from 3 frames and 1 empty slot.
    Grid:
    [ Cam A | Cam B ]
    [ Cam C | empty ]
    """
    # All frames should have the same dimensions for tiling
    height, width, channels = frame_a.shape
    
    # Create an empty black frame for the 4th slot
    empty_slot = np.zeros((height, width, channels), dtype=np.uint8)
    
    # Create horizontal rows
    top_row = np.hstack((frame_a, frame_b))
    bottom_row = np.hstack((frame_c, empty_slot))
    
    # Stack rows vertically
    grid = np.vstack((top_row, bottom_row))
    
    return grid

def draw_fps(frame, fps):
    """
    Bonus: Draws the current FPS on the frame.
    """
    cv2.putText(frame, f"FPS: {fps:.2f}", (10, frame.shape[0] - 10), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    return frame

def calculate_fps(start_time, frame_count):
    """
    Calculates the frames per second.
    """
    elapsed_time = time.time() - start_time
    if elapsed_time > 0:
        return frame_count / elapsed_time
    return 0

def draw_global_ui(grid_frame, flow_report, trae_decision=None):
    """
    Draws global UI elements on the grid: flow arrows, alerts panel, and signal status.
    Phase 4: Adds TRAE reasoning logs and signal durations.
    """
    full_h, full_w, _ = grid_frame.shape
    h, w = full_h // 2, full_w // 2
    
    # 1. Flow Arrows (A -> B, A -> C)
    # A to B (Top-Left to Top-Right)
    cv2.arrowedLine(grid_frame, (w - 50, h // 2), (w + 50, h // 2), (255, 255, 255), 3)
    # A to C (Top-Left to Bottom-Left)
    cv2.arrowedLine(grid_frame, (w // 2, h - 50), (w // 2, h + 50), (255, 255, 255), 3)
    
    # 2. Intelligence Panel (Bottom-Right slot)
    panel_x, panel_y = w, h
    cv2.rectangle(grid_frame, (panel_x + 5, panel_y + 5), (full_w - 5, full_h - 5), (30, 30, 30), -1)
    
    # Title
    cv2.putText(grid_frame, "TRAE Multi-Agent Orchestrator", (panel_x + 20, panel_y + 35), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    
    # Reasoning Logs (Section 1)
    y_offset = panel_y + 70
    cv2.putText(grid_frame, "Reasoning Logs:", (panel_x + 20, y_offset), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
    y_offset += 25
    
    logs = trae_decision.get('reasoning', []) if trae_decision else []
    for log in logs[-5:]: # Show last 5 logs
        cv2.putText(grid_frame, log, (panel_x + 20, y_offset), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        y_offset += 20

    # Alerts (Section 2)
    y_offset += 10
    alerts = trae_decision.get('alerts', []) if trae_decision else flow_report['alerts']
    for alert in alerts[:2]: # Show top 2 alerts
        color = (0, 0, 255) if "[CRITICAL]" in alert or "[ALERT]" in alert else (0, 255, 255)
        cv2.putText(grid_frame, f"> {alert}", (panel_x + 20, y_offset), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        y_offset += 25

    # Signal Strategy (Section 3)
    y_offset = full_h - 110
    cv2.putText(grid_frame, "Signal Strategy:", (panel_x + 20, y_offset), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    
    y_offset += 30
    plan = trae_decision.get('signal_actions', {}) if trae_decision else flow_report['signal_plan']
    times = trae_decision.get('signals', {}) if trae_decision else flow_report['signal_plan']['times']
    
    for loc in ['A', 'B', 'C']:
        action = plan.get(loc, 'normal')
        time_sec = times.get(loc, 30)
        status_color = (0, 255, 0) if "normal" in action else (0, 165, 255)
        if "emergency" in action or "block" in action: status_color = (0, 0, 255)
        
        cv2.putText(grid_frame, f"Cam {loc}: {time_sec}s ({action})", (panel_x + 20, y_offset), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, status_color, 1)
        y_offset += 25
        
    return grid_frame
