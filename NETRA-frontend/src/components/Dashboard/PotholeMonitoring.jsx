import React, { useState, useEffect, useRef } from "react";

const PotholeMonitoring = () => {
    const [frameB64, setFrameB64] = useState(null);
    const [logs, setLogs] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [severity, setSeverity] = useState("LOW");
    const [status, setStatus] = useState("IDLE");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [runId, setRunId] = useState(null);
    const [results, setResults] = useState(null);
    const [showVideo, setShowVideo] = useState(false);

    const fileRef = useRef();
    const logsEndRef = useRef();
    const pollInterval = useRef();

    useEffect(() => {
        const handleWsMessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.dashboard === 'pothole_monitoring') {
                if (data.frame_b64) {
                    setFrameB64(data.frame_b64);
                    setShowVideo(false);
                }
                if (data.status) {
                    setStatus(data.status);
                    if (data.status === 'completed' || data.status === 'stopped') {
                        setResults(data);
                        if (data.summary) setSeverity(data.summary.severity);
                        setIsAnalyzing(false);
                        setShowVideo(true);
                    }
                }
                if (data.logs) setLogs(data.logs);
                if (data.alerts) setAlerts(data.alerts);
            }
        };

        if (window.dashboardWs) {
            window.dashboardWs.addEventListener('message', handleWsMessage);
        }

        return () => {
            if (window.dashboardWs) {
                window.dashboardWs.removeEventListener('message', handleWsMessage);
            }
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, []);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
        }
    }, [logs]);

    const startPipeline = async (formData) => {
        setStatus("ANALYZING");
        setIsAnalyzing(true);
        setFrameB64(null);
        setShowVideo(false);
        setResults(null);

        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            const res = await fetch(`${host}/run-pothole`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.run_id) {
                setRunId(data.run_id);
                pollResults(data.run_id);
            }
        } catch (err) {
            console.error(err);
            setStatus("IDLE");
            setIsAnalyzing(false);
        }
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('video', file);
        startPipeline(fd);
    };

    const handleCamera = () => {
        const fd = new FormData();
        fd.append('use_camera', 'true');
        startPipeline(fd);
    };

    const handleStop = async () => {
        if (!runId) return;
        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            await fetch(`${host}/stop-pothole/${runId}`, { method: 'POST' });
            setStatus("FINALIZING...");
        } catch (err) { console.error(err); }
    };

    const pollResults = (id) => {
        if (pollInterval.current) clearInterval(pollInterval.current);
        const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
        
        pollInterval.current = setInterval(async () => {
            try {
                const res = await fetch(`${host}/results/pothole/${id}`);
                const data = await res.json();

                if (data.status === 'completed') {
                    clearInterval(pollInterval.current);
                    setResults(data);
                    setSeverity(data.summary.severity);
                    setStatus("COMPLETED");
                    setIsAnalyzing(false);
                    setShowVideo(true);
                }
            } catch (err) { console.error(err); }
        }, 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="lg:col-span-2 space-y-6">
                <section className="bg-[#2a2a2a] rounded-2xl overflow-hidden border border-[#3a3a3a] shadow-2xl">
                    <div className="p-4 border-b border-[#3a3a3a] flex justify-between items-center bg-[#2d2d2d]">
                        <div className="flex items-center gap-2 font-bold text-sm tracking-tight">
                            <i className="fas fa-road text-[#ff4d00]"></i> POTHOLE DETECTION FEED
                        </div>
                        <div className="flex items-center gap-3">
                            {isAnalyzing && (
                                <span className={`px-3 py-1 rounded text-[10px] font-black uppercase bg-red-500/20 text-red-500 animate-pulse`}>
                                    {severity} SEVERITY
                                </span>
                            )}
                            <span className="px-3 py-1 bg-gray-700 text-gray-400 rounded text-[10px] font-bold uppercase">{status}</span>
                        </div>
                    </div>

                    <div className="relative aspect-video bg-black flex items-center justify-center group">
                        {frameB64 && !showVideo ? (
                            <img src={`data:image/jpeg;base64,${frameB64}`} className="w-full h-full object-contain" alt="Pothole Feed" />
                        ) : showVideo ? (
                            <video 
                                src={`${window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''}/workdir/${runId}/output.mp4`} 
                                controls 
                                autoPlay 
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="text-center space-y-4 opacity-40 group-hover:opacity-60 transition-opacity">
                                {status === "ANALYZING" ? (
                                    <>
                                        <i className="fas fa-circle-notch fa-spin text-6xl text-[#ff4d00]"></i>
                                        <p className="text-sm font-medium uppercase tracking-widest">AI analyzing road conditions...</p>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-cloud-upload-alt text-6xl"></i>
                                        <p className="text-sm font-medium uppercase tracking-widest">Awaiting road survey input</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-[#252525]">
                        <div className="flex flex-wrap gap-4">
                            <input type="file" ref={fileRef} hidden accept="video/*" onChange={handleUpload} />
                            {!isAnalyzing ? (
                                <>
                                    <button onClick={() => fileRef.current.click()} className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-xl text-sm font-bold transition-all border border-[#3a3a3a] flex items-center gap-2">
                                        <i className="fas fa-file-video"></i> UPLOAD VIDEO
                                    </button>
                                    <button onClick={handleCamera} className="px-6 py-3 bg-[#ff4d00] hover:bg-[#ff6a26] text-white rounded-xl text-sm font-black transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,77,0,0.2)]">
                                        <i className="fas fa-camera"></i> LIVE CAMERA
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleStop} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black transition-all flex items-center gap-2">
                                    <i className="fas fa-stop"></i> STOP ANALYSIS
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Analytics Section */}
                {results && (
                    <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl animate-slideUp">
                        <div className="flex items-center gap-2 font-bold text-sm mb-6">
                            <i className="fas fa-chart-bar text-[#ff4d00]"></i> RUN ANALYTICS
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-[#1c1c1c] p-4 rounded-xl border border-[#3a3a3a]">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Potholes</div>
                                <div className="text-2xl font-black text-[#ff4d00]">{results.summary.total_potholes}</div>
                            </div>
                            <div className="bg-[#1c1c1c] p-4 rounded-xl border border-[#3a3a3a]">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Severity</div>
                                <div className={`text-2xl font-black ${results.summary.severity === 'HIGH' ? 'text-red-500' : 'text-yellow-500'}`}>{results.summary.severity}</div>
                            </div>
                            <div className="bg-[#1c1c1c] p-4 rounded-xl border border-[#3a3a3a]">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Frames Analyzed</div>
                                <div className="text-2xl font-black text-white">{results.summary.total_frames}</div>
                            </div>
                            <div className="bg-[#1c1c1c] p-4 rounded-xl border border-[#3a3a3a]">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Detections/Frame</div>
                                <div className="text-2xl font-black text-blue-400">{(results.summary.total_potholes / (results.summary.total_frames || 1)).toFixed(2)}</div>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            <div className="space-y-6">
                <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl h-80 flex flex-col">
                    <div className="flex items-center gap-2 font-bold text-sm mb-4">
                        <i className="fas fa-terminal text-[#ff4d00]"></i> AGENT LOGS
                    </div>
                    <div ref={logsEndRef} className="flex-1 bg-black/40 rounded-xl p-4 font-mono text-[10px] overflow-y-auto space-y-2 custom-scrollbar">
                        {logs.map((log, idx) => (
                            <div key={idx} className={`flex gap-3 ${log.includes('[TRAE]') ? 'text-blue-400' : 'text-gray-400'}`}>
                                <span className="opacity-30">{new Date().toLocaleTimeString([], { hour12: false })}</span>
                                <span>{log}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl flex flex-col h-80">
                    <div className="flex items-center gap-2 font-bold text-sm mb-4">
                        <i className="fas fa-exclamation-triangle text-yellow-500"></i> DETECTION ALERTS
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {alerts.length > 0 ? alerts.map((alert, idx) => (
                            <div key={idx} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
                                <i className="fas fa-road text-yellow-500 mt-1"></i>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-yellow-500">ROAD DAMAGE</h4>
                                    <p className="text-xs text-gray-300">Risk: {alert.risk} | Frame: {alert.frame_id}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex items-center justify-center border border-dashed border-[#3a3a3a] rounded-xl text-gray-500 text-xs font-medium uppercase tracking-widest">
                                No active alerts
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* JSON Output Section */}
            <section className="lg:col-span-3 bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-[#3a3a3a] bg-[#2d2d2d] flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <i className="fas fa-code text-[#ff4d00]"></i> RAW ANALYTICS (JSON)
                    </div>
                </div>
                <div className="p-6 bg-black/40 max-h-96 overflow-y-auto custom-scrollbar">
                    <pre className="text-green-400 font-mono text-xs leading-relaxed">
                        {results ? JSON.stringify(results, null, 4) : "// Waiting for data..."}
                    </pre>
                </div>
            </section>
        </div>
    );
};

export default PotholeMonitoring;
