class PropagationAgent:
    """
    Purpose: Predict where traffic will propagate and when.
    Logic: IF A=HIGH AND trend=increasing THEN predict congestion at downstream nodes.
    Includes filtering to avoid false predictions.
    """
    def run(self, cam_intel, topology, estimated_times, flow_report):
        predictions = []
        flows = flow_report.get("flows", [])
        
        for flow in flows:
            # flow is "A_to_B"
            source, _, dest = flow.partition("_to_")
            
            if source in cam_intel and dest in cam_intel:
                source_data = cam_intel[source]
                dest_data = cam_intel[dest]
                
                # Rule: High or Medium traffic with increasing trend, or very high traffic (> 40 vehicles)
                is_heavy = source_data['traffic_density'] in ["HIGH", "MEDIUM"]
                is_increasing = source_data['trend'] == "increasing"
                is_critical = source_data['vehicle_count'] > 40
                
                if (is_heavy and is_increasing) or is_critical:
                    
                    # Intelligent Filtering: 
                    # Skip only if downstream is LOW and the difference is very small (< 10)
                    if dest_data['traffic_density'] == "LOW" and (source_data['vehicle_count'] - dest_data['vehicle_count'] < 10):
                        continue
                    
                    time_key = f"{source}_{dest}_time"
                    in_minutes = estimated_times.get(time_key, 2.0)
                    
                    predictions.append({
                        "location": dest,
                        "from": source,
                        "in_minutes": in_minutes
                    })
        
        return {"predictions": predictions}
