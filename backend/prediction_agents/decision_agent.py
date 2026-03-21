class PredictionDecisionAgent:
    """
    Purpose: Prepare coordinated signal actions based on predictions.
    IF: congestion predicted at B in 2 mins THEN: increase green at B BEFORE 2 mins.
    """
    def run(self, predictions):
        signal_plan = {}
        alerts = []
        
        for pred in predictions.get("predictions", []):
            loc = pred["location"]
            source = pred["from"]
            minutes = pred["in_minutes"]
            
            # Add alert (Avoid emojis for OpenCV compatibility)
            alerts.append(f"[ALERT] Traffic from {source} will reach {loc} in {minutes} minutes")
            
            # Plan action
            signal_plan[loc] = {
                "action": "increase_green",
                "start_in": "immediate", # Proactive adjustment
                "reason": f"Anticipating wave from {source}"
            }
            
        return {
            "signal_plan": signal_plan,
            "alerts": alerts
        }
