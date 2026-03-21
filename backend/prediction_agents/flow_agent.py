class FlowDetectionAgent:
    """
    Purpose: Detect flow direction between connected nodes.
    IF: A traffic > B traffic THEN: flow A -> B
    """
    def run(self, cam_intel, topology):
        flows = []
        for source, destinations in topology.items():
            if source not in cam_intel:
                continue
            
            source_count = cam_intel[source]['vehicle_count']
            
            for dest in destinations:
                if dest in cam_intel:
                    dest_count = cam_intel[dest]['vehicle_count']
                    # If source has significantly more traffic, flow is moving toward dest
                    if source_count > dest_count + 5:
                        flows.append(f"{source}_to_{dest}")
        
        return {"flows": flows}
