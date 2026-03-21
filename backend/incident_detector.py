import cv2
import numpy as np
from collections import deque

class IncidentDetector:
    def __init__(self, buffer_size=15):
        """
        Initializes the IncidentDetector with temporal buffers for motion and counts.
        """
        self.buffer_size = buffer_size
        self.history = {} # per-location history: {loc: {'prev_frame': gray, 'motion_scores': deque, 'counts': deque}}
        
        # Thresholds
        self.motion_threshold = 0.05 # 5% of pixels changing
        self.crowd_spike_factor = 1.5 # 50% increase in people count

    def compute_motion(self, location, current_frame):
        """
        Computes motion score using frame differencing.
        """
        gray = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)
        
        if location not in self.history:
            self.history[location] = {
                'prev_frame': gray,
                'motion_scores': deque(maxlen=self.buffer_size),
                'counts': deque(maxlen=self.buffer_size)
            }
            return 0.0
        
        prev_frame = self.history[location]['prev_frame']
        frame_delta = cv2.absdiff(prev_frame, gray)
        thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
        
        # Motion score is fraction of changed pixels
        motion_score = np.sum(thresh) / (thresh.shape[0] * thresh.shape[1] * 255)
        
        self.history[location]['prev_frame'] = gray
        self.history[location]['motion_scores'].append(motion_score)
        
        return motion_score

    def detect_incidents(self, location, detections, motion_score, vehicle_count, people_count, accident_info=None):
        """
        Main logic to detect suspicious activities and accidents.
        """
        history = self.history[location]
        history['counts'].append({'v': vehicle_count, 'p': people_count})
        
        # Suspicious Activity Detection
        prev_p_counts = [c['p'] for c in list(history['counts'])[:-1]]
        avg_p = np.mean(prev_p_counts) if prev_p_counts else people_count
        crowd_spike = people_count > (avg_p * self.crowd_spike_factor) and people_count > 5
        abnormal_motion = motion_score > 0.15 # Very high motion
        suspicious = crowd_spike or abnormal_motion

        # Accident Detection (from TrafficDetector)
        accident_detected = False
        if accident_info and accident_info["detected"]:
            accident_detected = True

        # Risk Assignment
        risk_level = "LOW"
        incident_type = "none"
        confidence = 0.0
        
        if accident_detected:
            incident_type = "accident"
            risk_level = "CRITICAL"
            confidence = accident_info["confidence"]
        elif suspicious:
            incident_type = "suspicious_activity"
            risk_level = "HIGH" if abnormal_motion else "MEDIUM"
            confidence = 0.75 if abnormal_motion else 0.65
        
        return {
            "location": location,
            "incident": incident_type,
            "confidence": round(confidence, 2),
            "risk_level": risk_level,
            "motion_score": round(motion_score, 4),
            "crowd_spike": crowd_spike
        }
