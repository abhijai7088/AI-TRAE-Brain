let ws;
const logsContainer = document.getElementById('reasoning-logs');
const signalBody = document.getElementById('signal-body');
const alertsContainer = document.getElementById('alerts-container');
const connectionStatus = document.getElementById('connection-status');
const scenarioLabel = document.getElementById('current-scenario-label');
const uploadForm = document.getElementById('upload-form');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');

// --- WebSocket Connection & Unified Receiver ---
function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        connectionStatus.textContent = 'ONLINE';
        connectionStatus.classList.remove('disconnected');
        connectionStatus.classList.add('connected');
        console.log('Connected to WebSocket');
    };
    
    ws.onclose = () => {
        connectionStatus.textContent = 'OFFLINE';
        connectionStatus.classList.remove('connected');
        connectionStatus.classList.add('disconnected');
        console.log('WebSocket disconnected. Retrying in 3s...');
        setTimeout(connect, 3000);
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Route updates based on dashboard
        if (data.dashboard === 'pothole_monitoring') {
            updatePotholeLiveUI(data);
        } else if (data.dashboard === 'suspicious_monitoring') {
            updateSuspiciousLiveUI(data);
        } else {
            // Default: Traffic Dashboard (1)
            updateTrafficUI(data);
        }
    };
}

function updateTrafficUI(data) {
    const statusLabel = document.getElementById('traffic-status-label');
    const liveBadge = document.getElementById('traffic-live-badge');
    
    // 1. Update Video Feed (Base64)
    if (data.frame_b64) {
        document.getElementById('main-video-feed').src = `data:image/jpeg;base64,${data.frame_b64}`;
        statusLabel.textContent = 'PROCESSING';
        statusLabel.className = 'status-tag warning';
        liveBadge.style.display = 'flex';
    }

    // 2. Update Traffic Lights & Timers
    if (data.signals) {
        ['A', 'B', 'C'].forEach(loc => {
            const signalData = data.signals[loc];
            const node = document.getElementById(`signal-${loc}`);
            const timer = document.getElementById(`timer-${loc}`);
            const lights = {
                red: document.getElementById(`light-${loc}-red`),
                yellow: document.getElementById(`light-${loc}-yellow`),
                green: document.getElementById(`light-${loc}-green`)
            };

            // Update timer
            timer.textContent = `${signalData.time_remaining}s`;

            // Reset lights
            Object.values(lights).forEach(l => l.classList.remove('active'));
            
            // Set active light
            const activeLight = signalData.state.toLowerCase();
            if (lights[activeLight]) lights[activeLight].classList.add('active');

            // Handle emergency flashing
            if (data.emergency && (loc === 'B' || data.accident?.cam_B)) {
                node.classList.add('emergency');
            } else {
                node.classList.remove('emergency');
            }
        });
    }

    // 3. Update Logs
    if (data.logs) {
        logsContainer.innerHTML = data.logs.map(log => {
            let type = 'info';
            if (log.includes('EMERGENCY') || log.includes('🚨')) type = 'error';
            else if (log.includes('OPTIMIZATION')) type = 'warning';
            return `<div class="log-line ${type}"><span class="timestamp">${new Date().toLocaleTimeString()}</span> ${log}</div>`;
        }).join('');
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    // 4. Update Signal Strategy Table
    if (data.signals) {
        signalBody.innerHTML = '';
        const locations = ['A', 'B', 'C'];
        locations.forEach(loc => {
            const row = document.createElement('tr');
            const state = data.signals[loc].state;
            const time = data.signals[loc].time_remaining;
            const reason = (data.reasons && data.reasons[loc]) ? data.reasons[loc] : 'Maintain balance';
            
            let statusClass = 'status-tag normal';
            if (state === 'GREEN') statusClass = 'status-tag success';
            else if (state === 'YELLOW') statusClass = 'status-tag warning';
            else if (state === 'RED') statusClass = 'status-tag error';

            row.innerHTML = `
                <td>Location ${loc}</td>
                <td style="font-family: var(--font-mono); color: var(--accent)">${time}s</td>
                <td><span class="${statusClass}">${state}</span></td>
                <td style="color: var(--text-muted); font-size: 0.8rem;">${reason}</td>
            `;
            signalBody.appendChild(row);
        });
    }

    // 5. Update Alerts
    if (data.alerts && data.alerts.length > 0) {
        alertsContainer.innerHTML = data.alerts.map(alert => `
            <div class="alert-card ${alert.includes('🚨') ? '' : 'warning'}">
                <div class="alert-content">
                    <h4>${alert.includes('🚨') ? 'EMERGENCY' : 'TRAFFIC INCIDENT'}</h4>
                    <p>${alert}</p>
                </div>
                <i class="fas ${alert.includes('🚨') ? 'fa-radiation-alt' : 'fa-exclamation-triangle'}" style="font-size: 1.25rem;"></i>
            </div>
        `).join('');
    } else {
        alertsContainer.innerHTML = '<div class="placeholder-view"><p>No active incidents</p></div>';
    }
}

function updatePotholeLiveUI(data) {
    const liveImgId = 'pothole-live-img';
    if (data.frame_b64) {
        potholePlaceholder.style.display = 'none';
        potholeVideo.style.display = 'none';
        potholeLoader.style.display = 'none';
        
        let liveImg = document.getElementById(liveImgId);
        if (!liveImg) {
            liveImg = document.createElement('img');
            liveImg.id = liveImgId;
            liveImg.style.width = '100%';
            liveImg.style.height = '100%';
            liveImg.style.objectFit = 'contain';
            potholeVideo.parentElement.appendChild(liveImg);
        }
        liveImg.style.display = 'block';
        liveImg.src = `data:image/jpeg;base64,${data.frame_b64}`;
    }
    
    if (data.logs) {
        potholeLogs.innerHTML = data.logs.map(log => 
            `<div class="log-line ${log.includes('[TRAE]') ? 'info' : ''}"><span class="timestamp">${new Date().toLocaleTimeString()}</span> ${log}</div>`
        ).join('');
        potholeLogs.scrollTop = potholeLogs.scrollHeight;
    }

    if (data.alerts && data.alerts.length > 0) {
        potholeAlerts.innerHTML = data.alerts.map(alert => `
            <div class="alert-card warning">
                <div class="alert-content">
                    <h4>ROAD DAMAGE</h4>
                    <p>Risk: ${alert.risk} | Frame: ${alert.frame_id}</p>
                </div>
                <i class="fas fa-road" style="color: var(--warning)"></i>
            </div>
        `).join('');
    }
}

function updateSuspiciousLiveUI(data) {
    const liveImgId = 'suspicious-live-img';
    if (data.frame_b64) {
        suspiciousPlaceholder.style.display = 'none';
        suspiciousVideo.style.display = 'none';
        suspiciousLoader.style.display = 'none';
        
        let liveImg = document.getElementById(liveImgId);
        if (!liveImg) {
            liveImg = document.createElement('img');
            liveImg.id = liveImgId;
            liveImg.style.width = '100%';
            liveImg.style.height = '100%';
            liveImg.style.objectFit = 'contain';
            suspiciousVideo.parentElement.appendChild(liveImg);
        }
        liveImg.style.display = 'block';
        liveImg.src = `data:image/jpeg;base64,${data.frame_b64}`;
    }

    if (data.people_count !== undefined) {
        const counter = document.getElementById('people-counter');
        const countVal = document.getElementById('people-count-val');
        countVal.textContent = data.people_count;
        counter.style.display = 'flex';
    }
    
    if (data.logs) {
        suspiciousLogs.innerHTML = data.logs.map(log => 
            `<div class="log-line ${log.includes('[TRAE]') ? 'info' : ''}"><span class="timestamp">${new Date().toLocaleTimeString()}</span> ${log}</div>`
        ).join('');
        suspiciousLogs.scrollTop = suspiciousLogs.scrollHeight;
    }

    if (data.alerts && data.alerts.length > 0) {
        suspiciousAlerts.innerHTML = data.alerts.map(alert => `
            <div class="alert-card">
                <div class="alert-content">
                    <h4>THREAT DETECTED</h4>
                    <p>Type: ${alert.type.toUpperCase()} | Risk: ${alert.risk}</p>
                </div>
                <i class="fas fa-user-shield" style="color: var(--error)"></i>
            </div>
        `).join('');
    }
}

async function setScenario(scenario) {
    try {
        const response = await fetch(`/scenario/${scenario}`, { method: 'POST' });
        const data = await response.json();
        scenarioLabel.textContent = `SCENARIO: ${scenario.toUpperCase()}`;
        console.log('Scenario set to:', scenario);
    } catch (error) {
        console.error('Error setting scenario:', error);
    }
}

uploadForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('fileA', document.getElementById('fileA').files[0]);
    formData.append('fileB', document.getElementById('fileB').files[0]);
    formData.append('fileC', document.getElementById('fileC').files[0]);

    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> INITIALIZING...';

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        document.getElementById('traffic-status-label').textContent = 'RUNNING';
        document.getElementById('traffic-status-label').className = 'status-tag success';
    } catch (error) {
        console.error('Upload failed:', error);
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> START ANALYSIS';
    }
};

stopBtn.onclick = async () => {
    const response = await fetch('/stop', { method: 'POST' });
    const result = await response.json();
    
    stopBtn.style.display = 'none';
    startBtn.style.display = 'inline-flex';
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-play"></i> START ANALYSIS';
    document.getElementById('traffic-status-label').textContent = 'IDLE';
    document.getElementById('traffic-status-label').className = 'status-tag';
    document.getElementById('traffic-live-badge').style.display = 'none';
    
    // Fetch latest summary after stopping
    setTimeout(async () => {
        const summaryRes = await fetch('/logs/latest');
        const summaryData = await summaryRes.json();
        if (summaryData.data) {
            showFinalJSON(summaryData.data);
        }
    }, 1000);
};

function showFinalJSON(data) {
    const modal = document.getElementById('json-modal');
    const output = document.getElementById('final-json-output');
    output.textContent = JSON.stringify(data, null, 4);
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('json-modal').style.display = 'none';
}

// --- Unified Dashboard Switcher ---
function switchDashboard(type) {
    const btns = {
        traffic: document.getElementById('btn-traffic'),
        pothole: document.getElementById('btn-pothole'),
        suspicious: document.getElementById('btn-suspicious')
    };
    const views = {
        traffic: document.getElementById('traffic-dashboard'),
        pothole: document.getElementById('pothole-dashboard'),
        suspicious: document.getElementById('suspicious-dashboard')
    };

    Object.keys(btns).forEach(key => {
        btns[key].classList.toggle('active', key === type);
        views[key].style.display = key === type ? 'grid' : 'none';
    });
}

// --- Dashboard 2: Pothole Logic ---
const potholeFile = document.getElementById('pothole-file');
const potholeCamBtn = document.getElementById('pothole-cam-btn');
const potholeVideo = document.getElementById('pothole-video');
const potholePlaceholder = document.getElementById('pothole-placeholder');
const potholeLoader = document.getElementById('pothole-loader');
const potholeLogs = document.getElementById('pothole-logs');
const potholeAlerts = document.getElementById('pothole-alerts');
const potholeJson = document.getElementById('pothole-json-output');
const potholeBadge = document.getElementById('pothole-severity-badge');

let potholePolling = null;

const potholeStopBtn = document.getElementById('pothole-stop-btn');
const potholeUploadBtn = document.getElementById('pothole-upload-btn');

let currentPotholeRunId = null;
let currentSuspiciousRunId = null;

async function startPotholePipeline(formData) {
    potholePlaceholder.style.display = 'none';
    potholeVideo.style.display = 'none';
    potholeLoader.style.display = 'flex';
    potholeBadge.style.display = 'none';
    
    // Disable controls
    potholeCamBtn.disabled = true;
    potholeUploadBtn.disabled = true;
    
    const isCamera = formData.get('use_camera') === 'true';

    const oldImg = document.getElementById('pothole-live-img');
    if (oldImg) oldImg.style.display = 'none';

    potholeLogs.innerHTML = `<div class="log-line info"><span class="timestamp">${new Date().toLocaleTimeString()}</span> [UI] ${isCamera ? 'Opening Camera...' : 'Uploading Video...'}</div>`;
    potholeAlerts.innerHTML = '';
    potholeJson.textContent = '// Processing...';

    try {
        const res = await fetch('/run-pothole', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.run_id) {
            currentPotholeRunId = data.run_id;
            // Show stop button for both camera and upload
            potholeCamBtn.style.display = 'none';
            potholeUploadBtn.style.display = 'none';
            potholeStopBtn.style.display = 'inline-flex';
            pollPotholeResults(data.run_id);
        } else {
            throw new Error(data.detail || "Failed to start run");
        }
    } catch (err) {
        console.error(err);
        potholeLoader.style.display = 'none';
        potholePlaceholder.style.display = 'flex';
        potholeCamBtn.disabled = false;
        potholeUploadBtn.disabled = false;
        potholeLogs.innerHTML = `<div class="log-line error"><span class="timestamp">${new Date().toLocaleTimeString()}</span> [ERROR] ${err.message}</div>`;
    }
}

potholeStopBtn.onclick = async () => {
    if (!currentPotholeRunId) return;
    try {
        await fetch(`/stop-pothole/${currentPotholeRunId}`, { method: 'POST' });
        potholeStopBtn.disabled = true;
        potholeStopBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> FINALIZING...';
    } catch (err) { console.error(err); }
};

function pollPotholeResults(runId) {
    if (!runId || runId === 'undefined') return;
    if (potholePolling) clearInterval(potholePolling);
    
    potholePolling = setInterval(async () => {
        try {
            const logsRes = await fetch(`/logs/pothole/${runId}`);
            if (!logsRes.ok) return;
            const logsData = await logsRes.json();
            if (logsData.logs) {
                potholeLogs.innerHTML = logsData.logs.map(log => 
                    `<div class="log-line ${log.includes('[TRAE]') ? 'info' : ''}"><span class="timestamp">${new Date().toLocaleTimeString()}</span> ${log}</div>`
                ).join('');
                potholeLogs.scrollTop = potholeLogs.scrollHeight;
            }

            const res = await fetch(`/results/pothole/${runId}`);
            if (!res.ok) return;
            const data = await res.json();

            if (data.status === 'completed') {
                clearInterval(potholePolling);
                potholeLoader.style.display = 'none';
                
                // Re-enable
                potholeCamBtn.disabled = false;
                potholeUploadBtn.disabled = false;
                potholeCamBtn.style.display = 'inline-flex';
                potholeStopBtn.style.display = 'none';
                potholeStopBtn.disabled = false;
                potholeStopBtn.innerHTML = '<i class="fas fa-stop"></i> STOP';

                const oldImg = document.getElementById('pothole-live-img');
                if (oldImg) oldImg.style.display = 'none';

                const videoSrc = `/workdir/${runId}/output.mp4?t=${new Date().getTime()}`;
                potholeVideo.src = videoSrc;
                potholeVideo.load();
                potholeVideo.style.display = 'block';
                potholeJson.textContent = JSON.stringify(data, null, 4);
                
                potholeBadge.textContent = `${data.summary.severity} SEVERITY`;
                potholeBadge.className = `severity-indicator sev-${data.summary.severity.toLowerCase()}`;
                potholeBadge.style.display = 'block';

                if (data.trae_agent.alerts.length > 0) {
                    potholeAlerts.innerHTML = data.trae_agent.alerts.map(alert => `
                        <div class="alert-card warning">
                            <div class="alert-content">
                                <h4>ROAD DAMAGE</h4>
                                <p>Risk: ${alert.risk} | Frame: ${alert.frame_id}</p>
                            </div>
                            <i class="fas fa-road" style="color: var(--warning)"></i>
                        </div>
                    `).join('');
                }
            }
        } catch (err) { console.error(err); }
    }, 2000);
}

potholeFile.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('video', file);
    startPotholePipeline(fd);
};

potholeCamBtn.onclick = () => {
    const fd = new FormData();
    fd.append('use_camera', 'true');
    startPotholePipeline(fd);
};

// --- Dashboard 3: Suspicious Logic ---
const suspiciousFile = document.getElementById('suspicious-file');
const suspiciousCamBtn = document.getElementById('suspicious-cam-btn');
const suspiciousVideo = document.getElementById('suspicious-video');
const suspiciousPlaceholder = document.getElementById('suspicious-placeholder');
const suspiciousLoader = document.getElementById('suspicious-loader');
const suspiciousLogs = document.getElementById('suspicious-logs');
const suspiciousAlerts = document.getElementById('suspicious-alerts');
const suspiciousJson = document.getElementById('suspicious-json-output');
const suspiciousBadge = document.getElementById('suspicious-severity-badge');
const peopleCounter = document.getElementById('people-counter');

let suspiciousPolling = null;

const suspiciousStopBtn = document.getElementById('suspicious-stop-btn');
const suspiciousUploadBtn = document.getElementById('suspicious-upload-btn');

async function startSuspiciousPipeline(formData) {
    suspiciousPlaceholder.style.display = 'none';
    suspiciousVideo.style.display = 'none';
    suspiciousLoader.style.display = 'flex';
    suspiciousBadge.style.display = 'none';
    peopleCounter.style.display = 'none';
    
    // Disable controls
    suspiciousCamBtn.disabled = true;
    suspiciousUploadBtn.disabled = true;

    const isCamera = formData.get('use_camera') === 'true';
    const oldImg = document.getElementById('suspicious-live-img');
    if (oldImg) oldImg.style.display = 'none';

    suspiciousLogs.innerHTML = `<div class="log-line info"><span class="timestamp">${new Date().toLocaleTimeString()}</span> [UI] ${isCamera ? 'Opening Surveillance...' : 'Analyzing Video...'}</div>`;
    suspiciousAlerts.innerHTML = '';
    suspiciousJson.textContent = '// Processing...';

    try {
        const res = await fetch('/run-suspicious', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.run_id) {
            currentSuspiciousRunId = data.run_id;
            // Show stop button for both camera and upload
            suspiciousCamBtn.style.display = 'none';
            suspiciousUploadBtn.style.display = 'none';
            suspiciousStopBtn.style.display = 'inline-flex';
            pollSuspiciousResults(data.run_id);
        } else {
            throw new Error(data.detail || "Failed to start run");
        }
    } catch (err) {
        console.error(err);
        suspiciousLoader.style.display = 'none';
        suspiciousPlaceholder.style.display = 'flex';
        suspiciousCamBtn.disabled = false;
        suspiciousUploadBtn.disabled = false;
        suspiciousLogs.innerHTML = `<div class="log-line error"><span class="timestamp">${new Date().toLocaleTimeString()}</span> [ERROR] ${err.message}</div>`;
    }
}

suspiciousStopBtn.onclick = async () => {
    if (!currentSuspiciousRunId) return;
    try {
        await fetch(`/stop-suspicious/${currentSuspiciousRunId}`, { method: 'POST' });
        suspiciousStopBtn.disabled = true;
        suspiciousStopBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> FINALIZING...';
    } catch (err) { console.error(err); }
};

function pollSuspiciousResults(runId) {
    if (!runId || runId === 'undefined') return;
    if (suspiciousPolling) clearInterval(suspiciousPolling);
    
    suspiciousPolling = setInterval(async () => {
        try {
            const logsRes = await fetch(`/logs/suspicious/${runId}`);
            if (!logsRes.ok) return;
            const logsData = await logsRes.json();
            if (logsData.logs) {
                suspiciousLogs.innerHTML = logsData.logs.map(log => 
                    `<div class="log-line ${log.includes('[TRAE]') ? 'info' : ''}"><span class="timestamp">${new Date().toLocaleTimeString()}</span> ${log}</div>`
                ).join('');
                suspiciousLogs.scrollTop = suspiciousLogs.scrollHeight;
            }

            const res = await fetch(`/results/suspicious/${runId}`);
            if (!res.ok) return;
            const data = await res.json();

            if (data.status === 'completed') {
                clearInterval(suspiciousPolling);
                suspiciousLoader.style.display = 'none';
                
                // Re-enable
                suspiciousCamBtn.disabled = false;
                suspiciousUploadBtn.disabled = false;
                suspiciousCamBtn.style.display = 'inline-flex';
                suspiciousStopBtn.style.display = 'none';
                suspiciousStopBtn.disabled = false;
                suspiciousStopBtn.innerHTML = '<i class="fas fa-stop"></i> STOP';

                const oldImg = document.getElementById('suspicious-live-img');
                if (oldImg) oldImg.style.display = 'none';

                const videoSrc = `/workdir/${runId}/output.mp4?t=${new Date().getTime()}`;
                suspiciousVideo.src = videoSrc;
                suspiciousVideo.load();
                suspiciousVideo.style.display = 'block';
                suspiciousJson.textContent = JSON.stringify(data, null, 4);
                
                suspiciousBadge.textContent = `${data.summary.severity} SEVERITY`;
                suspiciousBadge.className = `severity-indicator sev-${data.summary.severity.toLowerCase()}`;
                suspiciousBadge.style.display = 'block';
                
                document.getElementById('people-count-val').textContent = data.summary.max_people_count;
                peopleCounter.style.display = 'flex';

                if (data.trae_agent.alerts.length > 0) {
                    suspiciousAlerts.innerHTML = data.trae_agent.alerts.map(alert => `
                        <div class="alert-card">
                            <div class="alert-content">
                                <h4>THREAT DETECTED</h4>
                                <p>Type: ${alert.type.toUpperCase()} | Risk: ${alert.risk}</p>
                            </div>
                            <i class="fas fa-user-shield" style="color: var(--error)"></i>
                        </div>
                    `).join('');
                }
            }
        } catch (err) { console.error(err); }
    }, 2000);
}

suspiciousFile.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('video', file);
    startSuspiciousPipeline(fd);
};

suspiciousCamBtn.onclick = () => {
    const fd = new FormData();
    fd.append('use_camera', 'true');
    startSuspiciousPipeline(fd);
};

connect();
