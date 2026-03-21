from agents.local_agent import LocalAgent
from agents.global_agent import GlobalAgent
from agents.prediction_agent import PredictionAgent
from agents.risk_agent import RiskAgent
from agents.decision_agent import DecisionAgent
from agents.execution_agent import ExecutionAgent

class MainOrchestrator:
    def __init__(self):
        # Initialize all 6 TRAE agents
        self.local_agent = LocalAgent()
        self.global_agent = GlobalAgent()
        self.prediction_agent = PredictionAgent()
        self.risk_agent = RiskAgent()
        self.decision_agent = DecisionAgent()
        self.execution_agent = ExecutionAgent()
        
        # Buffer for reasoning logs
        self.reasoning_logs = []

    def log_reasoning(self, agent_name, message):
        log = f"[TRAE:{agent_name}] {message}"
        self.reasoning_logs.append(log)
        # Keep only the last 15 logs to avoid UI clutter
        if len(self.reasoning_logs) > 15:
            self.reasoning_logs.pop(0)

    def run(self, cam_intel, cam_incidents, flow_report):
        """
        Orchestrates the multi-agent reasoning system.
        """
        # Clear previous logs for this run to avoid repetition
        self.reasoning_logs = []
        
        # 1. Local Agent: Unify inputs
        unified_data = self.local_agent.run(cam_intel, cam_incidents)
        self.log_reasoning("LocalAgent", f"Unified data for locations: {list(unified_data.keys())}")

        # 2. Global Context Agent: Topology
        topology = self.global_agent.run(unified_data)
        self.log_reasoning("GlobalAgent", f"Upstream: {topology['upstream']}, Downstream: {topology['downstream']}")

        # 3. Prediction Validation Agent
        predictions = self.prediction_agent.run(flow_report, unified_data)
        self.log_reasoning("PredictionAgent", f"Validated predictions: {predictions['validated_predictions']}")

        # 4. Risk & Priority Agent
        priorities, incidents = self.risk_agent.run(unified_data, predictions['validated_predictions'])
        for loc, p in priorities.items():
            if p != "LOW":
                self.log_reasoning("RiskAgent", f"Location {loc} prioritized as {p}")
                if loc in incidents:
                    self.log_reasoning("RiskAgent", f"Accident detected at {loc} (Risk: {incidents[loc]['risk']})")

        # 5. Decision Agent (Coordinated decisions)
        decision_output = self.decision_agent.run(priorities, incidents, flow_report, unified_data)
        for loc, action in decision_output["signal_actions"].items():
            if action != "normal_balance":
                self.log_reasoning("DecisionAgent", f"Action for {loc}: {action}")
        
        # New: Log specific global response actions
        if decision_output["emergency"]:
            self.log_reasoning("DecisionAgent", "Emergency response: Blocking inflow and diverting traffic")

        # 6. Execution Agent (UI/Signals)
        execution_output = self.execution_agent.run(decision_output, unified_data, priorities)
        
        # Combine everything for the final output
        final_decision = {
            "summary": {
                "priorities": priorities,
                "incidents": incidents,
                "decisions": decision_output["decisions"]
            },
            "signal_actions": decision_output["signal_actions"],
            "emergency": decision_output["emergency"],
            "alerts": execution_output["alerts"],
            "signals": execution_output["signals"],
            "reasons": execution_output.get("reasons", {}),
            "reasoning": self.reasoning_logs
        }
        
        return final_decision
