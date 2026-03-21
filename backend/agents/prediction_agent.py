class PredictionAgent:
    """
    Purpose: Validate predictions from Flow Analyzer.
    Logic: Confirm if predicted loc is already MEDIUM/HIGH density.
    """
    def run(self, flow_report, unified_data):
        predicted = flow_report.get("predicted_congestion", [])
        validated = []
        
        for loc in predicted:
            if loc in unified_data:
                density = unified_data[loc]["intel"]["traffic_density"]
                if density in ["MEDIUM", "HIGH"]:
                    validated.append(loc)
        
        return {
            "validated_predictions": validated
        }
