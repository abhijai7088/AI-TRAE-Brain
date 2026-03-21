from collections import deque
import numpy as np

class TrafficAnalyzer:
    def __init__(self, buffer_size=10, low_threshold=15, high_threshold=40):
        """
        Initializes the TrafficAnalyzer with configurable thresholds and buffer size.
        Per-location state is stored in self.history.
        """
        self.buffer_size = buffer_size
        self.low_threshold = low_threshold
        self.high_threshold = high_threshold
        
        # Dictionary to store a deque of vehicle counts per location
        self.history = {}

    def update(self, location, vehicle_count, people_count):
        """
        Updates the analyzer with current frame data and returns an intelligence report.
        """
        # Initialize history for new location
        if location not in self.history:
            self.history[location] = deque(maxlen=self.buffer_size)
        
        # Add current count to rolling buffer
        self.history[location].append(vehicle_count)
        
        # Compute analysis
        density = self.compute_density(vehicle_count)
        trend, growth_rate = self.compute_trend(location)
        congestion = self.compute_congestion(density, trend)
        score = self.compute_score(vehicle_count, trend)
        
        # Return structured output for the frame/location
        return {
            "location": location,
            "vehicle_count": vehicle_count,
            "people_count": people_count,
            "traffic_density": density,
            "trend": trend,
            "growth_rate": round(growth_rate, 2),
            "congestion": congestion,
            "traffic_score": score
        }

    def compute_density(self, vehicle_count):
        """
        Classifies traffic density based on predefined thresholds.
        """
        if vehicle_count < self.low_threshold:
            return "LOW"
        elif vehicle_count < self.high_threshold:
            return "MEDIUM"
        else:
            return "HIGH"

    def compute_trend(self, location):
        """
        Computes the traffic trend and growth rate using the rolling buffer.
        """
        counts = list(self.history[location])
        if len(counts) < 2:
            return "stable", 0.0
        
        current = counts[-1]
        previous_avg = np.mean(counts[:-1])
        growth_rate = current - previous_avg
        
        # Define threshold for "stable" trend (e.g., within +/- 2 vehicles)
        if growth_rate > 2:
            trend = "increasing"
        elif growth_rate < -2:
            trend = "decreasing"
        else:
            trend = "stable"
            
        return trend, growth_rate

    def compute_congestion(self, density, trend):
        """
        Detects congestion based on density and trend.
        """
        if density == "HIGH" and trend == "increasing":
            return True
        return False

    def compute_score(self, vehicle_count, trend):
        """
        Computes a numeric traffic score (0-100).
        """
        # Base score: min(100, vehicle_count * 2)
        base_score = min(100, vehicle_count * 2)
        
        # Increase score if trend is increasing
        if trend == "increasing":
            base_score = min(100, base_score + 10)
        
        return int(base_score)
