class RiskAgent:
    """
    Purpose: Combine traffic + incidents into priority levels.
    Now detects accident severity for TRAE reasoning.
    """
    def run(self, unified_data, validated_predictions):
        priorities = {}
        incidents = {}
        
        for loc, data in unified_data.items():
            density = data["intel"]["traffic_density"]
            incident_type = data["incident"]["incident"]
            
            # 1. Critical Priority: Accident or Incident
            if incident_type != "none":
                priorities[loc] = "CRITICAL"
                incidents[loc] = {
                    "type": incident_type,
                    "risk": data["incident"]["risk_level"]
                }
            # 2. High Priority: Predicted congestion + high traffic
            elif loc in validated_predictions and density == "HIGH":
                priorities[loc] = "HIGH"
            # 3. Medium Priority: Moderate traffic
            elif density == "MEDIUM":
                priorities[loc] = "MEDIUM"
            # 4. Low Priority: Normal
            else:
                priorities[loc] = "LOW"
        
        return priorities, incidents
