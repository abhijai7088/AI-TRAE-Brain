class PotholeAgent:
    def __init__(self, logger):
        self.logger = logger
        self.agent_name = "POTHOLE_AGENT"

    def analyze_frame(self, frame_id, pothole_count):
        risk_level = "LOW"
        if pothole_count > 1:
            risk_level = "CRITICAL"
        elif pothole_count == 1:
            risk_level = "HIGH"

        if pothole_count > 0:
            self.logger.log(f"[TRAE] Pothole detected at frame {frame_id}")
            self.logger.log(f"[TRAE] Risk Level: {risk_level}")

        return {
            "type": "pothole",
            "risk": risk_level,
            "frame_id": frame_id
        }

    def get_final_severity(self, total_frames_with_potholes, max_potholes_in_single_frame):
        if max_potholes_in_single_frame > 1:
            return "CRITICAL"
        elif max_potholes_in_single_frame == 1:
            return "HIGH"
        elif total_frames_with_potholes > 0:
            return "MEDIUM"
        return "LOW"
