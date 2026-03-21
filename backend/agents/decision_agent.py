class DecisionAgent:
    """
    Purpose: Make final coordinated decisions based on priorities and risks.
    """
    def run(self, priorities, incidents, flow_report, unified_data):
        signal_actions = {}
        emergency_mode = False
        decisions = []
        
        # Priority mapping for signal actions
        for loc, p in priorities.items():
            # 1. Critical Actions (Accidents/Incidents)
            if p == "CRITICAL":
                emergency_mode = True
                signal_actions[loc] = "emergency_override"
                decisions.append(f"EMERGENCY_OVERRIDE_{loc}")
                
                # Global Response: Block inflow to emergency zone
                if loc == "B":
                    # If accident on B, block inflow from A
                    signal_actions["A"] = "block_inflow"
                    decisions.append("block_inflow_A_due_to_B_emergency")
                    # Optionally slow down C to prepare for diversion
                    if "C" in priorities:
                        signal_actions["C"] = "prepare_diversion"
                        decisions.append("prepare_diversion_C")
            
            # 2. Congestion Actions (only if not in emergency mode for this location)
            elif p == "HIGH" and loc not in signal_actions:
                signal_actions[loc] = "increase_green"
                decisions.append(f"NORMAL_OPTIMIZATION_{loc}")
                
            elif loc not in signal_actions:
                signal_actions[loc] = "normal_balance"

        return {
            "signal_actions": signal_actions,
            "emergency": emergency_mode,
            "decisions": decisions
        }
