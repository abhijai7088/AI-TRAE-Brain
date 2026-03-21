import React, { useState, useEffect, useRef } from 'react';

const PotholeDashboard = () => {
    const [runId, setRunId] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, processing, completed, failed
    const [logs, setLogs] = useState([]);
    const [results, setResults] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [severity, setSeverity] = useState('LOW');
    const logsEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const API_BASE = window.location.origin;

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    // Polling for logs and results
    useEffect(() => {
        let interval;
        if (status === 'processing' && runId) {
            interval = setInterval(async () => {
                try {
                    // Fetch logs
                    const logsRes = await fetch(`${API_BASE}/logs/pothole/${runId}`);
                    const logsData = await logsRes.json();
                    if (logsData.logs) setLogs(logsData.logs);

                    // Check results
                    const resultsRes = await fetch(`${API_BASE}/results/pothole/${runId}`);
                    const resultsData = await resultsRes.json();
                    
                    if (resultsData.status === 'completed') {
                        setResults(resultsData);
                        setStatus('completed');
                        setSeverity(resultsData.summary.severity);
                        // Add cache-busting timestamp to video URL
                        setVideoUrl(`${API_BASE}/workdir/${runId}/output.mp4?t=${new Date().getTime()}`);
                        clearInterval(interval);
                    } else if (resultsData.status === 'failed') {
                        setStatus('failed');
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [status, runId]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('video', file);

        startPipeline(formData);
    };

    const handleCamera = async () => {
        const formData = new FormData();
        formData.append('use_camera', 'true');
        startPipeline(formData);
    };

    const startPipeline = async (formData) => {
        setStatus('processing');
        setLogs(['[UI] Initiating pipeline...']);
        setResults(null);
        setVideoUrl(null);

        try {
            const res = await fetch(`${API_BASE}/run-pothole`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            setRunId(data.run_id);
        } catch (err) {
            console.error("Start error:", err);
            setStatus('failed');
            setLogs(prev => [...prev, '[UI] Failed to start pipeline']);
        }
    };

    const getSeverityColor = (sev) => {
        switch (sev) {
            case 'CRITICAL': return 'bg-red-600 text-white';
            case 'HIGH': return 'bg-orange-500 text-white';
            case 'MEDIUM': return 'bg-yellow-500 text-black';
            default: return 'bg-green-500 text-white';
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
            <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-cyan-400">AI-TRAE Brain</h1>
                    <p className="text-slate-400">Dashboard 2: Pothole Monitoring System</p>
                </div>
                <div className="flex gap-4">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleUpload} 
                        className="hidden" 
                        accept="video/*"
                    />
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
                        disabled={status === 'processing'}
                    >
                        📁 Upload Video
                    </button>
                    <button 
                        onClick={handleCamera}
                        className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition"
                        disabled={status === 'processing'}
                    >
                        📷 Start Camera (Index 2)
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-12 gap-6">
                {/* Left: Video & Results */}
                <div className="col-span-8 space-y-6">
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 aspect-video flex items-center justify-center relative overflow-hidden">
                        {status === 'processing' ? (
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                                <p className="text-xl">Processing Video...</p>
                            </div>
                        ) : videoUrl ? (
                            <video key={videoUrl} controls className="w-full h-full rounded-lg">
                                <source src={videoUrl} type="video/mp4" />
                            </video>
                        ) : (
                            <div className="text-slate-500 text-center">
                                <p className="text-6xl mb-4">📹</p>
                                <p>Select input to begin analysis</p>
                            </div>
                        )}
                        
                        {status === 'completed' && results && (
                            <div className="absolute top-4 right-4 animate-bounce">
                                <span className={`px-4 py-2 rounded-full font-bold shadow-lg ${getSeverityColor(severity)}`}>
                                    {severity} SEVERITY
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span>📄</span> Final JSON Output
                        </h2>
                        <pre className="bg-black p-4 rounded-lg text-emerald-400 text-xs overflow-auto max-h-96 border border-slate-700">
                            {results ? JSON.stringify(results, null, 4) : "// Final results will appear here after run completes"}
                        </pre>
                    </div>
                </div>

                {/* Right: Logs & Alerts */}
                <div className="col-span-4 space-y-6 flex flex-col h-[calc(100vh-200px)]">
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex-1 flex flex-col overflow-hidden">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span>🧠</span> TRAE Reasoning Logs
                        </h2>
                        <div className="bg-black rounded-lg p-4 font-mono text-sm flex-1 overflow-y-auto space-y-2 border border-slate-700">
                            {logs.map((log, i) => (
                                <div key={i} className={`${log.includes('[TRAE]') ? 'text-cyan-400' : 'text-slate-400'}`}>
                                    {log}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>

                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span>🚨</span> System Alerts
                        </h2>
                        {results && results.trae_agent.alerts.length > 0 ? (
                            <div className="space-y-3">
                                {results.trae_agent.alerts.slice(-3).map((alert, i) => (
                                    <div key={i} className="bg-red-900/30 border-l-4 border-red-500 p-3 rounded text-sm animate-pulse">
                                        <p className="font-bold text-red-400">⚠ ROAD DAMAGE DETECTED</p>
                                        <p className="text-slate-300">Severity: {alert.risk} | Frame: {alert.frame_id}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-slate-500 text-center py-4 italic text-sm">
                                No active alerts
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PotholeDashboard;
