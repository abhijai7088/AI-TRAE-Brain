import asyncio
import json
import os
import shutil
import threading
import sys
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, BackgroundTasks, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
import base64
import time
from engine import UrbanPulseEngine

# Add the 'backend' and 'backend/app' directory to sys.path for Pothole components
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "app"))

try:
    from app.pipeline.pothole_pipeline import PotholeDetectionPipeline
    from app.pipeline.suspicious_pipeline import SuspiciousDetectionPipeline
except ImportError:
    try:
        from pipeline.pothole_pipeline import PotholeDetectionPipeline
        from pipeline.suspicious_pipeline import SuspiciousDetectionPipeline
    except ImportError:
        # Direct relative import if path manipulation fails
        sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "pipeline"))
        from pothole_pipeline import PotholeDetectionPipeline
        from suspicious_pipeline import SuspiciousDetectionPipeline

@asynccontextmanager
async def lifespan(app: FastAPI):
    global main_loop
    main_loop = asyncio.get_event_loop()
    yield
    # Shutdown logic here if needed

app = FastAPI(title="AI-TRAE Brain: Unified Intelligence System", lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if not exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Define paths relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
MODEL_DIR = os.path.join(PROJECT_ROOT, "models")
NETRA_FRONTEND_DIST = os.path.join(PROJECT_ROOT, "NETRA-frontend", "dist")

# Global engine instance
YOLO_MODEL = os.path.join(MODEL_DIR, "yolov8n.pt")
ACCIDENT_MODEL = os.path.join(MODEL_DIR, "best.pt")

engine = UrbanPulseEngine(model_path=YOLO_MODEL, accident_model_path=ACCIDENT_MODEL)
processing_thread = None

# Store connected dashboard clients
clients: List[WebSocket] = []
main_loop = None

# Current system state
current_state = {
    "run_id": None,
    "dashboard": "traffic_monitoring",
    "status": "idle",
    "traffic": {"cam_A": 0, "cam_B": 0, "cam_C": 0},
    "accident": {"cam_B": False, "confidence": 0.0},
    "signals": {"A": {"state": "RED", "time_remaining": 30}, "B": {"state": "GREEN", "time_remaining": 30}, "C": {"state": "RED", "time_remaining": 30}},
    "trae_agent": {"agent": "TRAFFIC_AGENT", "decision": "NORMAL_BALANCE", "reason": "System starting..."},
    "summary": {"priorities": {}, "incidents": {}, "decisions": []},
    "logs": [],
    "alerts": [],
    "emergency": False,
    "frame_b64": None
}

# Current active demo scenario
current_scenario = "normal" 

@app.get("/scenario")
async def get_scenario():
    return {"scenario": current_scenario}

@app.post("/scenario/{scenario_name}")
async def set_scenario(scenario_name: str):
    global current_scenario
    current_scenario = scenario_name
    return {"status": "success", "scenario": current_scenario}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.remove(websocket)

async def broadcast_update(data: dict):
    global current_state
    current_state = data
    disconnected_clients = []
    for client in clients:
        try:
            await client.send_json(data)
        except:
            disconnected_clients.append(client)
    for client in disconnected_clients:
        if client in clients: clients.remove(client)

def sync_broadcast_update(data: dict):
    """
    Synchronous wrapper to broadcast updates from a worker thread.
    """
    if main_loop:
        asyncio.run_coroutine_threadsafe(broadcast_update(data), main_loop)

@app.post("/upload")
async def upload_videos(
    fileA: UploadFile = File(...), 
    fileB: UploadFile = File(...), 
    fileC: UploadFile = File(...)
):
    # Save files
    paths = {}
    for label, file in [('A', fileA), ('B', fileB), ('C', fileC)]:
        path = os.path.join(UPLOAD_DIR, f"cam_{label}.mp4")
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        paths[label] = path
    
    # Start processing in a separate thread
    global processing_thread
    if engine.is_running:
        engine.stop()
        if processing_thread:
            processing_thread.join()
            
    # Reset engine state before starting new processing
    engine.reset_state()
            
    processing_thread = threading.Thread(
        target=engine.process_videos, 
        args=(paths, lambda: current_scenario, sync_broadcast_update)
    )
    processing_thread.daemon = True
    processing_thread.start()
    
    return {"status": "Processing started", "files": list(paths.values())}

@app.post("/run-sample-traffic")
async def run_sample_traffic():
    paths = {
        'A': r"C:\knowledge\SGU\AI-TRAE_Brain\demo_videos\20.mp4",
        'B': r"C:\knowledge\SGU\AI-TRAE_Brain\demo_videos\2.mp4",
        'C': r"C:\knowledge\SGU\AI-TRAE_Brain\demo_videos\10.mp4"
    }
    
    # Check if files exist
    for loc, path in paths.items():
        if not os.path.exists(path):
            # Try relative path if absolute fails
            rel_path = os.path.join(PROJECT_ROOT, "demo_videos", f"{'20' if loc == 'A' else '2' if loc == 'B' else '10'}.mp4")
            if os.path.exists(rel_path):
                paths[loc] = rel_path
            else:
                raise HTTPException(status_code=404, detail=f"Sample video for Cam {loc} not found at {path} or {rel_path}")
            
    # Start processing in a separate thread
    global processing_thread
    if engine.is_running:
        engine.stop()
        if processing_thread:
            processing_thread.join()
            
    engine.reset_state()
            
    processing_thread = threading.Thread(
        target=engine.process_videos, 
        args=(paths, lambda: current_scenario, sync_broadcast_update)
    )
    processing_thread.daemon = True
    processing_thread.start()
    
    return {"status": "Sample processing started", "files": list(paths.values())}

@app.post("/stop")
async def stop_processing():
    engine.stop()
    return {"status": "Processing stopped"}

@app.get("/logs/list")
async def list_logs():
    log_dir = "system_logs"
    if not os.path.exists(log_dir):
        return {"logs": []}
    files = [f for f in os.listdir(log_dir) if f.startswith("run_summary_") and f.endswith(".json")]
    files.sort(reverse=True) # Newest first
    return {"logs": files}

@app.get("/logs/latest")
async def get_latest_log():
    log_dir = "system_logs"
    if not os.path.exists(log_dir):
        return {"status": "error", "message": "No logs found"}
    files = [f for f in os.listdir(log_dir) if f.startswith("run_summary_") and f.endswith(".json")]
    if not files:
        return {"status": "error", "message": "No summary files found"}
    
    files.sort(reverse=True)
    latest_file = os.path.join(log_dir, files[0])
    with open(latest_file, "r") as f:
        data = json.load(f)
    return {"filename": files[0], "data": data}

# --- Dashboard 2: Pothole Monitoring Endpoints ---

active_pothole_pipelines = {}

@app.post("/run-pothole")
async def run_pothole(
    background_tasks: BackgroundTasks,
    video: Optional[UploadFile] = File(None),
    use_camera: str = Form("false")
):
    run_id = f"pothole_{uuid.uuid4().hex}"
    pothole_workdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workdir", run_id)
    os.makedirs(pothole_workdir, exist_ok=True)

    is_camera = use_camera.lower() == "true"

    input_path = None
    if video and video.filename:
        input_path = os.path.join(pothole_workdir, "input.mp4")
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    elif not is_camera:
        raise HTTPException(status_code=400, detail="Either video file or use_camera must be provided")

    pipeline = PotholeDetectionPipeline(run_id)
    active_pothole_pipelines[run_id] = pipeline
    
    background_tasks.add_task(pipeline.process, input_path, is_camera, sync_broadcast_update)

    return {
        "run_id": run_id,
        "status": "started"
    }

@app.post("/stop-pothole/{run_id}")
async def stop_pothole(run_id: str):
    if run_id in active_pothole_pipelines:
        active_pothole_pipelines[run_id].stop()
        return {"status": "success", "message": "Pothole pipeline stopping"}
    raise HTTPException(status_code=404, detail="Run ID not found")

@app.get("/results/pothole/{run_id}")
async def get_pothole_results(run_id: str):
    results_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workdir", run_id, "results.json")
    if os.path.exists(results_file):
        with open(results_file, "r") as f:
            return json.load(f)
    
    if run_id in active_pothole_pipelines:
        return {
            "run_id": run_id,
            "status": active_pothole_pipelines[run_id].status,
            "message": "Processing in progress"
        }
    
    raise HTTPException(status_code=404, detail="Run ID not found")

@app.get("/logs/pothole/{run_id}")
async def get_pothole_logs(run_id: str):
    if run_id in active_pothole_pipelines:
        return {"run_id": run_id, "logs": active_pothole_pipelines[run_id].logger.get_logs()}
    
    log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workdir", run_id, "logs.txt")
    if os.path.exists(log_file):
        with open(log_file, "r") as f:
            return {"run_id": run_id, "logs": f.readlines()}
            
    raise HTTPException(status_code=404, detail="Run ID not found")

# --- Admin Panel & Ticket System ---

tickets = []

class Ticket(BaseModel):
    id: str
    dashboard: str
    issue: str
    severity: str
    status: str = "open"
    timestamp: float
    replies: List[str] = []

@app.get("/admin/summary")
async def get_admin_summary():
    # Gather summaries from all active components
    traffic_status = "running" if engine.is_running else "idle"
    
    pothole_runs = []
    for rid, pipe in active_pothole_pipelines.items():
        pothole_runs.append({"run_id": rid, "status": pipe.status})
        
    suspicious_runs = []
    for rid, pipe in active_suspicious_pipelines.items():
        suspicious_runs.append({"run_id": rid, "status": pipe.status})
        
    return {
        "traffic": {
            "status": traffic_status,
            "signals": current_state["signals"],
            "emergency": current_state["emergency"]
        },
        "potholes": pothole_runs,
        "suspicious": suspicious_runs,
        "total_tickets": len(tickets),
        "open_tickets": len([t for t in tickets if t["status"] == "open"])
    }

@app.post("/admin/tickets")
async def create_ticket(dashboard: str = Form(...), issue: str = Form(...), severity: str = Form(...)):
    ticket = {
        "id": f"TKT-{uuid.uuid4().hex[:6].upper()}",
        "dashboard": dashboard,
        "issue": issue,
        "severity": severity,
        "status": "open",
        "timestamp": time.time(),
        "replies": []
    }
    tickets.append(ticket)
    return ticket

@app.get("/admin/tickets")
async def get_tickets():
    return tickets

@app.post("/admin/tickets/{ticket_id}/reply")
async def reply_ticket(ticket_id: str, message: str = Form(...)):
    for ticket in tickets:
        if ticket["id"] == ticket_id:
            ticket["replies"].append(message)
            ticket["status"] = "replied"
            return ticket
    raise HTTPException(status_code=404, detail="Ticket not found")

@app.post("/admin/tickets/{ticket_id}/close")
async def close_ticket(ticket_id: str):
    for ticket in tickets:
        if ticket["id"] == ticket_id:
            ticket["status"] = "closed"
            return ticket
    raise HTTPException(status_code=404, detail="Ticket not found")

active_suspicious_pipelines = {}

@app.post("/run-suspicious")
async def run_suspicious(
    background_tasks: BackgroundTasks,
    video: Optional[UploadFile] = File(None),
    use_camera: str = Form("false")
):
    run_id = f"suspicious_{uuid.uuid4().hex}"
    suspicious_workdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workdir", run_id)
    os.makedirs(suspicious_workdir, exist_ok=True)

    is_camera = use_camera.lower() == "true"

    input_path = None
    if video and video.filename:
        input_path = os.path.join(suspicious_workdir, "input.mp4")
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    elif not is_camera:
        raise HTTPException(status_code=400, detail="Either video file or use_camera must be provided")

    pipeline = SuspiciousDetectionPipeline(run_id)
    active_suspicious_pipelines[run_id] = pipeline
    
    background_tasks.add_task(pipeline.process, input_path, is_camera, sync_broadcast_update)

    return {
        "run_id": run_id,
        "status": "started"
    }

@app.post("/stop-suspicious/{run_id}")
async def stop_suspicious(run_id: str):
    if run_id in active_suspicious_pipelines:
        active_suspicious_pipelines[run_id].stop()
        return {"status": "success", "message": "Suspicious pipeline stopping"}
    raise HTTPException(status_code=404, detail="Run ID not found")

@app.get("/results/suspicious/{run_id}")
async def get_suspicious_results(run_id: str):
    results_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workdir", run_id, "results.json")
    if os.path.exists(results_file):
        with open(results_file, "r") as f:
            return json.load(f)
    
    if run_id in active_suspicious_pipelines:
        return {
            "run_id": run_id,
            "status": active_suspicious_pipelines[run_id].status,
            "message": "Processing in progress"
        }
    
    raise HTTPException(status_code=404, detail="Run ID not found")

@app.get("/logs/suspicious/{run_id}")
async def get_suspicious_logs(run_id: str):
    if run_id in active_suspicious_pipelines:
        return {"run_id": run_id, "logs": active_suspicious_pipelines[run_id].logger.get_logs()}
    
    log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workdir", run_id, "logs.txt")
    if os.path.exists(log_file):
        with open(log_file, "r") as f:
            return {"run_id": run_id, "logs": f.readlines()}
            
    raise HTTPException(status_code=404, detail="Run ID not found")

# Serve static files for workdir
WORKDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workdir")
os.makedirs(WORKDIR, exist_ok=True)
app.mount("/workdir", StaticFiles(directory=WORKDIR), name="workdir")

# Serve the built React app (NETRA-frontend)
if os.path.exists(NETRA_FRONTEND_DIST):
    # Mount the assets and other static files
    app.mount("/assets", StaticFiles(directory=os.path.join(NETRA_FRONTEND_DIST, "assets")), name="assets")
    
    # Catch-all for React routing (serves index.html for unknown paths like /dashboard)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # List of excluded paths that should not be handled by React routing
        excluded = ["ws", "upload", "stop", "scenario", "logs", "results", "run-pothole", "run-suspicious", "stop-pothole", "stop-suspicious", "workdir"]
        if any(full_path.startswith(prefix) for prefix in excluded):
            # Let FastAPI handle these
            raise HTTPException(status_code=404)
            
        file_path = os.path.join(NETRA_FRONTEND_DIST, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Fallback to index.html for React Router
        return FileResponse(os.path.join(NETRA_FRONTEND_DIST, "index.html"))
else:
    # Fallback to old frontend if dist doesn't exist
    FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
    if os.path.exists(FRONTEND_DIR):
        app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import socket
    def find_free_port(start_port=8000, max_tries=10):
        for port in range(start_port, start_port + max_tries):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                try:
                    s.bind(("127.0.0.1", port))
                    return port
                except socket.error:
                    continue
        return start_port
    port = find_free_port()
    print(f"\n[SYSTEM] Starting AI-TRAE Brain on http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port)
