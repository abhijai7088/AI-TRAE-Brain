class LocalAgent:
    """
    Purpose: Normalize and unify inputs from all cameras.
    """
    def run(self, cam_intel, cam_incidents):
        unified_data = {}
        for loc in cam_intel.keys():
            unified_data[loc] = {
                "intel": cam_intel[loc],
                "incident": cam_incidents.get(loc, {"incident": "none", "risk_level": "LOW"})
            }
        return unified_data
