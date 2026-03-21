class FlowAnalyzer:
    def __init__(self):
        """
        Initializes the FlowAnalyzer for inter-camera intelligence.
        Predefined road flow: A -> B and A -> C.
        """
        self.flow_chain = ['A', 'B', 'C']
        self.signal_times = {
            'A': 30, # Default seconds
            'B': 30,
            'C': 30
        }

    def analyze_flow(self, cam_intelligence, cam_incidents):
        """
        Main entry point for inter-camera analysis.
        Takes dictionaries of intelligence and incidents per camera.
        """
        # 1. Compare cameras and detect flow direction
        flow_direction = self.detect_flow_direction(cam_intelligence)
        
        # 2. Predict congestion propagation
        predictions = self.predict_congestion(cam_intelligence)
        
        # 3. Generate alerts
        alerts = self.generate_alerts(cam_intelligence, predictions, cam_incidents)
        
        # 4. Create signal plan
        signal_plan = self.create_signal_plan(cam_intelligence, predictions, cam_incidents)
        
        return {
            "flow_direction": flow_direction,
            "predicted_congestion": predictions,
            "alerts": alerts,
            "signal_plan": signal_plan,
            "emergency_mode": False
        }

    def detect_flow_direction(self, cam_intel):
        """
        Identifies the dominant traffic flow direction based on counts.
        """
        # Predefined flow is A -> B and A -> C
        if 'A' in cam_intel:
            a_count = cam_intel['A']['vehicle_count']
            if 'B' in cam_intel and a_count > cam_intel['B']['vehicle_count'] + 5:
                return "A_to_B"
            if 'C' in cam_intel and a_count > cam_intel['C']['vehicle_count'] + 5:
                return "A_to_C"
        return "stable"

    def predict_congestion(self, cam_intel):
        """
        Predicts future congestion based on density and trends in the flow chain.
        """
        predictions = []
        
        # Rule: If A is HIGH and increasing, B and C are likely to become congested
        if 'A' in cam_intel:
            if cam_intel['A']['traffic_density'] == "HIGH" and cam_intel['A']['trend'] == "increasing":
                if 'B' in cam_intel: predictions.append("B")
                if 'C' in cam_intel: predictions.append("C")
                
        return predictions

    def generate_alerts(self, cam_intel, predictions, cam_incidents):
        """
        Generates actionable early warnings for the TRAE decision system.
        """
        alerts = []
        
        # Density Alerts
        for loc, intel in cam_intel.items():
            if intel['traffic_density'] == "HIGH":
                alerts.append(f"High traffic load at Location {loc}")
        
        # Prediction Alerts
        for loc in predictions:
            alerts.append(f"Congestion expected at Location {loc} in ~2 mins")
            
        # Incident Alerts
        for loc, incident in cam_incidents.items():
            if incident['incident'] == "suspicious_activity":
                alerts.append(f"WARNING: Suspicious activity at Location {loc}")
                
        return alerts

    def create_signal_plan(self, cam_intel, predictions, cam_incidents):
        """
        Creates a dynamic signal strategy (signal times and flow actions).
        """
        plan = {
            'A': 'normal',
            'B': 'normal',
            'C': 'normal',
            'times': self.signal_times.copy()
        }
        
        # Default logic for predicted congestion
        for loc in predictions:
            plan[loc] = 'prepare_high_load'
            plan['times'][loc] += 20 # Increase green time
            
            # Reduce inflow from previous camera in chain
            if loc == 'B':
                plan['A'] = 'reduce_flow'
                plan['times']['A'] -= 10
            elif loc == 'C':
                plan['B'] = 'increase_outflow'
                plan['times']['B'] += 10
                    
        return plan
