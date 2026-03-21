class TimeEstimationAgent:
    """
    Purpose: Estimate arrival time based on distance and speed.
    Formula: time (minutes) = (distance / speed) * 60
    """
    def __init__(self, avg_speed=30):
        self.avg_speed = avg_speed

    def run(self, distances):
        times = {}
        for connection, distance in distances.items():
            # connection is like "A_B"
            travel_time = (distance / self.avg_speed) * 60
            times[f"{connection}_time"] = round(travel_time, 1)
        
        return times
