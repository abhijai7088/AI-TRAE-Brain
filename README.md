# 🚦 NETRA: AI-TRAE Brain

### **Multi-Node Traffic & Safety Intelligence System using TRAE**

> **“We are not controlling traffic lights — we are orchestrating city-wide intelligence.”**

---

## 🎥 Live Demo

👉 **Watch Full Demo:**
https://drive.google.com/file/d/1-WZHRPy0SH1oKAOXnQ5HoHp4rkG8ooTD/view?usp=sharing

---

## 🧠 Project Overview

**NETRA (Networked Enhanced Traffic & Road Analytics)** is a **multi-camera intelligent urban monitoring system** that leverages a **TRAE-based multi-agent architecture** to:

* Detect traffic conditions in real-time
* Predict congestion before it happens
* Identify accidents and suspicious activities
* Coordinate responses across multiple locations

Unlike traditional systems that operate per junction, **NETRA introduces coordinated, predictive, and explainable intelligence across the city.**

---

## 🚨 Problem Statement

Urban environments face:

* Traffic congestion and inefficient signal control
* Delayed emergency response to accidents
* Lack of coordination between traffic nodes
* Limited real-time intelligence from CCTV systems

---

## 💡 Our Solution

NETRA solves this by combining:

✅ Multi-camera computer vision
✅ Predictive traffic flow modeling
✅ Incident detection (accidents + anomalies)
✅ TRAE-based decision-making system

👉 Result:
**A unified intelligence layer that detects, predicts, and acts in real time.**

---

## 🧩 Key Features

### 🚥 1. Multi-Node Traffic Intelligence

* Real-time vehicle detection using **YOLOv8**
* Traffic density classification (LOW / MEDIUM / HIGH)
* Cross-camera traffic flow understanding (A → B → C)

---

### 🔮 2. Predictive Traffic Flow (Core Innovation)

* Estimates traffic propagation across locations
* Calculates **ETA of congestion using distance & speed**
* Generates alerts like:

```bash
⚠️ Traffic from A will reach B in 2 minutes
```

---

### 🚨 3. Accident Detection & Emergency Response

* Detects collisions and abnormal vehicle behavior
* Assigns **CRITICAL risk level**
* Automatically:

  * Clears routes
  * Adjusts traffic signals
  * Enables emergency flow

---

### 🛡️ 4. Suspicious Activity Detection

* Detects:

  * Crowd anomalies
  * Abnormal motion
  * Unusual behavior patterns
* Uses temporal analysis + object tracking

---

### 🌐 5. Multi-Camera Coordination (UNIQUE)

* Cameras are **not isolated**
* System understands:

  * Road topology
  * Traffic direction
* Coordinates actions across locations

---

### 🧠 6. TRAE: Traffic Reasoning & Action Engine

The core intelligence layer of NETRA.

#### 🔹 Agents:

| Agent            | Role                        |
| ---------------- | --------------------------- |
| Local Agent      | Processes camera-level data |
| Flow Agent       | Detects traffic direction   |
| Time Agent       | Estimates travel time       |
| Prediction Agent | Predicts congestion         |
| Risk Agent       | Detects incidents           |
| Decision Agent   | Generates actions           |
| Execution Agent  | Outputs final JSON          |

---

### 📦 7. Explainable AI Output (XAI)

Every decision is transparent:

```json
{
  "flow_direction": "A_to_B",
  "prediction": "B in 2 mins",
  "incident": "accident at A",
  "action": "divert traffic to C"
}
```

---

## 🏗️ System Architecture

```text
Camera Feeds (A, B, C)
        ↓
YOLO Detection + Video Analysis
        ↓
Traffic & Incident Processing
        ↓
TRAE Multi-Agent System
        ↓
Prediction + Decision Engine
        ↓
JSON Output + Dashboard UI
```

---

## 🖥️ Dashboard & Demo Flow

### 🎬 Live System Demonstration:

1. **Normal Traffic State**
2. **Congestion at Cam A**
3. **TRAE predicts flow → Cam B**
4. **Signal adjusted BEFORE congestion**
5. **Accident detected at Cam A**
6. **System diverts traffic to Cam C**

---

## 🛠️ Tech Stack

### 🔹 AI & Computer Vision

* YOLOv8 (Ultralytics)
* OpenCV
* MC3_18 3D CNN (Action Recognition)

### 🔹 Backend

* FastAPI
* WebSockets
* Python Multi-threading

### 🔹 Frontend

* React.js
* Tailwind CSS
* GSAP Animations

### 🔹 AI Architecture

* TRAE (Custom Multi-Agent System)
* Structured JSON decision engine

---

## 📁 Project Structure

```text
/AI-TRAE_Brain
├── /backend
│   ├── /app/pipeline
│   ├── engine.py
│   ├── detector.py
│   └── backend_api.py
├── /NETRA-frontend
│   ├── /src/components
│   └── /dist
├── /models
├── /agents
└── README.md
```

---

## 🚀 Getting Started

### 🔹 Backend

```bash
cd backend
pip install -r requirements.txt
python backend_api.py
```

---

### 🔹 Frontend

```bash
cd NETRA-frontend
npm install
npm run build
```

---

### 🌐 Access

```bash
http://localhost:8000
```

---

## 🔐 Demo Credentials

* **Username:** abhi7088
* **Password:** 12345

---

## 📊 Real-World Impact

* 🚗 Reduced congestion via predictive routing
* 🚑 Faster emergency response
* 🧠 Explainable decision-making for authorities
* 🌍 Scalable to smart city infrastructure

---

## 🏆 Innovation Highlights

* ✅ Multi-node coordination (rare in hackathons)
* ✅ Predictive traffic intelligence
* ✅ TRAE-based multi-agent reasoning
* ✅ Real-time decision system
* ✅ Explainable AI outputs

---

## 🔮 Future Scope

* Integration with real CCTV networks
* Smart city dashboards
* Emergency service APIs
* Live traffic routing for citizens

---

## 📜 License

This project is licensed under the MIT License.
