from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys

# Add the 'app' directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from routes import pothole
except ImportError:
    import routes.pothole as pothole

app = FastAPI(title="AI-TRAE Brain: Pothole Monitoring System")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(pothole.router, tags=["Pothole Detection"])

# Base directory of the backend
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKDIR = os.path.join(BASE_DIR, "workdir")

# Serve static files for workdir (to access output videos)
os.makedirs(WORKDIR, exist_ok=True)
app.mount("/workdir", StaticFiles(directory=WORKDIR), name="workdir")

@app.get("/")
async def root():
    return {"message": "AI-TRAE Brain: Pothole Monitoring System API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
