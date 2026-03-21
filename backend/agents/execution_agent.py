class ExecutionAgent:
    """
    Purpose: Convert decisions into alerts and signal times.
    """
    def run(self, decision_output, unified_data, priorities):
        alerts = []
        signal_times = {loc: 30 for loc in unified_data.keys()} # Default signal times
        reasons = {loc: "Maintain balance" for loc in unified_data.keys()}
        
        # Priority-based alerts
        for loc, p in priorities.items():
            if p == "CRITICAL":
                alerts.append(f"🚨 ACCIDENT DETECTED ({loc})! EMERGENCY_OVERRIDE active.")
                reasons[loc] = "Accident detected"
            elif p == "HIGH":
                alerts.append(f"[TRAE] High traffic density at {loc}. Normal optimization.")
                reasons[loc] = "Highest traffic density"
            elif p == "MEDIUM":
                alerts.append(f"[TRAE] Moderate traffic load at {loc}.")
                reasons[loc] = "Load balancing"
        
        # Coordinated Signal Times
        actions = decision_output["signal_actions"]
        for loc, action in actions.items():
            if action == "emergency_override":
                signal_times[loc] = 30 # Fixed override for accident
                reasons[loc] = "Emergency Response: Cam B prioritizing"
            elif action == "block_inflow":
                signal_times[loc] = 0 # RED
                reasons[loc] = "Inflow blocked for emergency"
            elif action == "increase_green":
                # Dynamic green time calculation: base_time + (vehicle_count * 0.2)
                v_count = unified_data.get(loc, {}).get('vehicle_count', 0)
                signal_times[loc] = int(10 + (v_count * 0.2))
                reasons[loc] = f"Highest traffic density ({v_count} vehicles)"
            elif action == "reduce_flow":
                signal_times[loc] = 10 # Short green to reduce inflow
                reasons[loc] = "Throttling inflow"
            elif action == "prepare_diversion":
                signal_times[loc] = 20 # YELLOW/Slow
                reasons[loc] = "Preparing diversion"
        
        return {
            "alerts": alerts,
            "signals": signal_times,
            "reasons": reasons
        }
