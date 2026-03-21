class SuspiciousAgent:
    def __init__(self, logger):
        self.logger = logger
        self.agent_name = "SUSPICIOUS_AGENT"

    def analyze_frame(self, frame_id, fight_detected, people_count, overcrowded):
        risk_level = "LOW"
        event_type = "normal"

        if fight_detected:
            risk_level = "CRITICAL"
            event_type = "fight"
            self.logger.log(f"[TRAE] Fight detected at frame {frame_id}")
        elif overcrowded:
            risk_level = "HIGH"
            event_type = "protest"
            self.logger.log(f"[TRAE] Crowd threshold exceeded at frame {frame_id}")
        
        if risk_level != "LOW":
            self.logger.log(f"[TRAE] Risk Level: {risk_level}")

        return {
            "type": event_type,
            "risk": risk_level,
            "frame_id": frame_id
        }

    def get_final_classification(self, fight_occurred, max_people, protest_inferred):
        severity = "LOW"
        event = "normal"

        if fight_occurred:
            severity = "CRITICAL"
            event = "fight"
        elif protest_inferred:
            severity = "HIGH"
            event = "protest"
        elif max_people > 10:
            severity = "MEDIUM"
            event = "crowd"

        return event, severity
