from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
import uuid
import os
import shutil
import json
from pipeline.pothole_pipeline import PotholeDetectionPipeline

router = APIRouter()

# Store active pipelines in memory
active_pipelines = {}

# Base directory of the backend
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@router.post("/run-pothole")
async def run_pothole(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(None),
    use_camera: bool = False
):
    run_id = f"pothole_{uuid.uuid4().hex}"
    workdir = os.path.join(BASE_DIR, "workdir", run_id)
    os.makedirs(workdir, exist_ok=True)

    input_path = None
    if video:
        input_path = os.path.join(workdir, "input.mp4")
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    elif not use_camera:
        raise HTTPException(status_code=400, detail="Either video file or use_camera must be provided")

    pipeline = PotholeDetectionPipeline(run_id)
    active_pipelines[run_id] = pipeline
    
    background_tasks.add_task(pipeline.process, input_path, use_camera)

    return {
        "run_id": run_id,
        "status": "started"
    }

@router.get("/results/{run_id}")
async def get_results(run_id: str):
    results_file = os.path.join(BASE_DIR, "workdir", run_id, "results.json")
    if os.path.exists(results_file):
        with open(results_file, "r") as f:
            return json.load(f)
    
    if run_id in active_pipelines:
        return {
            "run_id": run_id,
            "status": active_pipelines[run_id].status,
            "message": "Processing in progress"
        }
    
    raise HTTPException(status_code=404, detail="Run ID not found")

@router.get("/logs/{run_id}")
async def get_logs(run_id: str):
    if run_id in active_pipelines:
        return {"run_id": run_id, "logs": active_pipelines[run_id].logger.get_logs()}
    
    log_file = os.path.join(BASE_DIR, "workdir", run_id, "logs.txt")
    if os.path.exists(log_file):
        with open(log_file, "r") as f:
            return {"run_id": run_id, "logs": f.readlines()}
            
    raise HTTPException(status_code=404, detail="Run ID not found")
