from .flow_agent import FlowDetectionAgent
from .time_agent import TimeEstimationAgent
from .propagation_agent import PropagationAgent
from .decision_agent import PredictionDecisionAgent

class TrafficPredictionPipeline:
    def __init__(self, avg_speed=30):
        # Topology: A leads to B and C
        self.topology = {
            "A": ["B", "C"],
            "B": [],
            "C": []
        }
        
        # Distances in km
        self.distances = {
            "A_B": 1.0,
            "A_C": 1.5
        }
        
        # Initialize Agents
        self.flow_agent = FlowDetectionAgent()
        self.time_agent = TimeEstimationAgent(avg_speed=avg_speed)
        self.propagation_agent = PropagationAgent()
        self.decision_agent = PredictionDecisionAgent()
        
        self.reasoning_logs = []

    def log_reasoning(self, agent_name, message):
        log = f"[TRAE:{agent_name}] {message}"
        self.reasoning_logs.append(log)
        if len(self.reasoning_logs) > 15:
            self.reasoning_logs.pop(0)

    def run(self, cam_intel):
        """
        Runs the end-to-end traffic propagation prediction pipeline.
        """
        # Clear previous logs for this run
        self.reasoning_logs = []
        
        # 1. Flow Detection
        flow_report = self.flow_agent.run(cam_intel, self.topology)
        for flow in flow_report["flows"]:
            source, _, dest = flow.partition("_to_")
            self.log_reasoning("FlowAgent", f"High traffic at {source}. Flow direction {source} -> {dest}")

        # 2. Time Estimation
        estimated_times = self.time_agent.run(self.distances)
        # Log distances/times for detected flows
        for flow in flow_report["flows"]:
            source, _, dest = flow.partition("_to_")
            dist = self.distances.get(f"{source}_{dest}", 0)
            time_val = estimated_times.get(f"{source}_{dest}_time", 0)
            self.log_reasoning("TimeAgent", f"Distance {source}-{dest} = {dist} km. Estimated arrival = {time_val} mins")

        # 3. Propagation Prediction
        predictions = self.propagation_agent.run(cam_intel, self.topology, estimated_times, flow_report)
        for pred in predictions["predictions"]:
            self.log_reasoning("PropagationAgent", f"Predicting congestion at {pred['location']} from {pred['from']}")

        # 4. Decision Making
        decision = self.decision_agent.run(predictions)
        for loc, plan in decision["signal_plan"].items():
            self.log_reasoning("DecisionAgent", f"Increasing signal time at {loc} proactively")

        return {
            "flow": flow_report["flows"],
            "predictions": predictions["predictions"],
            "alerts": decision["alerts"],
            "signal_plan": decision["signal_plan"],
            "reasoning": self.reasoning_logs
        }
