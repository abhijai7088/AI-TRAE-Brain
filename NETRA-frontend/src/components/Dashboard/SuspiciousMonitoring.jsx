import React, { useState, useEffect, useRef } from "react";

const SuspiciousMonitoring = () => {
    const [frameB64, setFrameB64] = useState(null);
    const [logs, setLogs] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [severity, setSeverity] = useState("LOW");
    const [status, setStatus] = useState("IDLE");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [runId, setRunId] = useState(null);
    const [results, setResults] = useState(null);
    const [showVideo, setShowVideo] = useState(false);
    const [peopleCount, setPeopleCount] = useState(0);

    const fileRef = useRef();
    const logsEndRef = useRef();
    const pollInterval = useRef();

    useEffect(() => {
        const handleWsMessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.dashboard === 'suspicious_monitoring') {
                if (data.frame_b64) {
                    setFrameB64(data.frame_b64);
                    setShowVideo(false);
                }
                if (data.logs) setLogs(data.logs);
                if (data.alerts) setAlerts(data.alerts);
                if (data.people_count !== undefined) setPeopleCount(data.people_count);
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
        setStatus("SCANNING");
        setIsAnalyzing(true);
        setFrameB64(null);
        setShowVideo(false);
        setResults(null);
        setPeopleCount(0);

        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            const res = await fetch(`${host}/run-suspicious`, { method: 'POST', body: formData });
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
            await fetch(`${host}/stop-suspicious/${runId}`, { method: 'POST' });
            setStatus("FINALIZING...");
        } catch (err) { console.error(err); }
    };

    const pollResults = (id) => {
        if (pollInterval.current) clearInterval(pollInterval.current);
        const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
        
        pollInterval.current = setInterval(async () => {
            try {
                const res = await fetch(`${host}/results/suspicious/${id}`);
                const data = await res.json();

                if (data.status === 'completed') {
                    clearInterval(pollInterval.current);
                    setResults(data);
                    setSeverity(data.summary.severity);
                    setStatus("SECURE");
                    setIsAnalyzing(false);
                    setShowVideo(true);
                }
            } catch (err) { console.error(err); }
        }, 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="lg:col-span-2 space-y-6">
                <section className="bg-[#2a2a2a] rounded-2xl overflow-hidden border border-[#3a3a3a] shadow-2xl relative">
                    <div className="p-4 border-b border-[#3a3a3a] flex justify-between items-center bg-[#2d2d2d]">
                        <div className="flex items-center gap-2 font-bold text-sm tracking-tight">
                            <i className="fas fa-shield-alt text-[#ff4d00]"></i> SECURITY SURVEILLANCE FEED
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
                            <>
                                <img src={`data:image/jpeg;base64,${frameB64}`} className="w-full h-full object-contain" alt="Surveillance Feed" />
                                <div className="absolute top-4 right-4 bg-[#ff4d00] text-[#1c1c1c] px-3 py-1.5 rounded-lg flex items-center gap-2 font-black text-xs shadow-lg">
                                    <i className="fas fa-users"></i> {peopleCount}
                                </div>
                            </>
                        ) : showVideo ? (
                            <video 
                                src={`${window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''}/workdir/${runId}/output.mp4`} 
                                controls 
                                autoPlay 
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="text-center space-y-4 opacity-40 group-hover:opacity-60 transition-opacity">
                                {status === "SCANNING" ? (
                                    <>
                                        <i className="fas fa-shield-virus fa-spin text-6xl text-[#ff4d00]"></i>
                                        <p className="text-sm font-medium uppercase tracking-widest">Scanning for suspicious behavior...</p>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-user-secret text-6xl"></i>
                                        <p className="text-sm font-medium uppercase tracking-widest">Awaiting surveillance input</p>
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
                                        <i className="fas fa-video"></i> START MONITORING
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleStop} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black transition-all flex items-center gap-2">
                                    <i className="fas fa-stop"></i> STOP MONITORING
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {results && (
                    <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl animate-slideUp">
                        <div className="flex items-center gap-2 font-bold text-sm mb-6">
                            <i className="fas fa-user-shield text-[#ff4d00]"></i> SECURITY ANALYTICS
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-[#1c1c1c] p-4 rounded-xl border border-[#3a3a3a]">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Max People</div>
                                <div className="text-2xl font-black text-[#ff4d00]">{results.summary.max_people_count}</div>
                            </div>
                            <div className="bg-[#1c1c1c] p-4 rounded-xl border border-[#3a3a3a]">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Risk Level</div>
                                <div className={`text-2xl font-black ${results.summary.severity === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'}`}>{results.summary.severity}</div>
                            </div>
                            <div className="bg-[#1c1c1c] p-4 rounded-xl border border-[#3a3a3a]">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Main Event</div>
                                <div className="text-xl font-black text-white uppercase">{results.summary.event}</div>
                            </div>
                            <div className="bg-[#1c1c1c] p-4 rounded-xl border border-[#3a3a3a]">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Detections</div>
                                <div className="text-2xl font-black text-blue-400">{results.detections.length}</div>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            <div className="space-y-6">
                <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl h-80 flex flex-col">
                    <div className="flex items-center gap-2 font-bold text-sm mb-4">
                        <i className="fas fa-terminal text-[#ff4d00]"></i> SECURITY LOGS
                    </div>
                    <div ref={logsEndRef} className="flex-1 bg-black/40 rounded-xl p-4 font-mono text-[10px] overflow-y-auto space-y-2 custom-scrollbar">
                        {logs.map((log, idx) => (
                            <div key={idx} className={`flex gap-3 ${log.includes('[TRAE]') ? 'text-red-400' : 'text-gray-400'}`}>
                                <span className="opacity-30">{new Date().toLocaleTimeString([], { hour12: false })}</span>
                                <span>{log}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl flex flex-col h-80">
                    <div className="flex items-center gap-2 font-bold text-sm mb-4">
                        <i className="fas fa-bell text-red-500"></i> SECURITY ALERTS
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {alerts.length > 0 ? alerts.map((alert, idx) => (
                            <div key={idx} className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                                <i className="fas fa-radiation-alt text-red-500 mt-1"></i>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500">THREAT DETECTED</h4>
                                    <p className="text-xs text-gray-300">{alert.type.toUpperCase()} - Risk: {alert.risk}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex items-center justify-center border border-dashed border-[#3a3a3a] rounded-xl text-gray-500 text-xs font-medium uppercase tracking-widest">
                                No active threats
                            </div>
                        )}
                    </div>
                </section>
            </div>

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

export default SuspiciousMonitoring;
