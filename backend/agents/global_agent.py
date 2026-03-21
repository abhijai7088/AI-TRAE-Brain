class GlobalAgent:
    """
    Purpose: Understand road topology and relationships (A -> B -> C).
    """
    def __init__(self):
        self.topology = ["A", "B", "C"]

    def run(self, unified_data):
        # In this linear topology:
        # A is upstream for B and C
        # B is downstream for A, upstream for C
        # C is downstream for A and B
        
        # Simple rule: First is upstream, rest are downstream
        return {
            "upstream": [self.topology[0]],
            "downstream": self.topology[1:]
        }
