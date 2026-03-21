import React, { useState, useEffect, useRef } from "react";

const TrafficMonitoring = () => {
    const [status, setStatus] = useState("IDLE");
    const [frameB64, setFrameB64] = useState(null);
    const [signals, setSignals] = useState({
        A: { state: "RED", time_remaining: 30 },
        B: { state: "GREEN", time_remaining: 30 },
        C: { state: "RED", time_remaining: 30 }
    });
    const [logs, setLogs] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [reasons, setReasons] = useState({});
    const [scenario, setScenario] = useState("NORMAL");
    const [emergency, setEmergency] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const fileARef = useRef();
    const fileBRef = useRef();
    const fileCRef = useRef();
    const logsEndRef = useRef();

    useEffect(() => {
        const handleWsMessage = (event) => {
            const data = JSON.parse(event.data);
            // Log for debugging
            // console.log("Received data:", data.dashboard);
            
            if (data.dashboard === 'traffic_monitoring' || !data.dashboard || data.frame_b64) {
                if (data.frame_b64) {
                    setFrameB64(data.frame_b64);
                }
                if (data.signals) setSignals(data.signals);
                if (data.logs) setLogs(data.logs);
                if (data.alerts) setAlerts(data.alerts);
                if (data.reasons) setReasons(data.reasons);
                if (data.emergency !== undefined) setEmergency(data.emergency);
                if (data.status === 'running' || data.status === 'PROCESSING') setStatus("PROCESSING");
            }
        };

        // Use a small interval to ensure we catch the global WebSocket once it's initialized
        const checkWsInterval = setInterval(() => {
            if (window.dashboardWs) {
                window.dashboardWs.addEventListener('message', handleWsMessage);
                clearInterval(checkWsInterval);
            }
        }, 100);

        return () => {
            clearInterval(checkWsInterval);
            if (window.dashboardWs) {
                window.dashboardWs.removeEventListener('message', handleWsMessage);
            }
        };
    }, []);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
        }
    }, [logs]);

    const handleStartAnalysis = async (e) => {
        if (e) e.preventDefault();
        const formData = new FormData();
        formData.append('fileA', fileARef.current.files[0]);
        formData.append('fileB', fileBRef.current.files[0]);
        formData.append('fileC', fileCRef.current.files[0]);

        setStatus("INITIALIZING...");
        setIsAnalyzing(true);

        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            const response = await fetch(`${host}/upload`, {
                method: 'POST',
                body: formData
            });
            await response.json();
            setStatus("RUNNING");
        } catch (error) {
            console.error('Upload failed:', error);
            setStatus("IDLE");
            setIsAnalyzing(false);
        }
    };

    const handleSampleData = async () => {
        setStatus("INITIALIZING SAMPLE...");
        setIsAnalyzing(true);
        setFrameB64(null);

        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            const response = await fetch(`${host}/run-sample-traffic`, {
                method: 'POST'
            });
            const data = await response.json();
            if (data.status === "Sample processing started") {
                setStatus("RUNNING SAMPLE");
            }
        } catch (error) {
            console.error('Sample data failed:', error);
            setStatus("IDLE");
            setIsAnalyzing(false);
        }
    };

    const handleStopAnalysis = async () => {
        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            await fetch(`${host}/stop`, { method: 'POST' });
            setStatus("IDLE");
            setIsAnalyzing(false);
            setFrameB64(null);
        } catch (error) {
            console.error('Stop failed:', error);
        }
    };

    const setRemoteScenario = async (scen) => {
        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            await fetch(`${host}/scenario/${scen}`, { method: 'POST' });
            setScenario(scen.toUpperCase());
        } catch (error) {
            console.error('Scenario set failed:', error);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* Left & Middle: Video and Signals */}
            <div className="lg:col-span-2 space-y-6">
                <section className="bg-[#2a2a2a] rounded-2xl overflow-hidden border border-[#3a3a3a] shadow-2xl">
                    <div className="p-4 border-b border-[#3a3a3a] flex justify-between items-center bg-[#2d2d2d]">
                        <div className="flex items-center gap-2 font-bold text-sm tracking-tight">
                            <i className="fas fa-video text-[#ff4d00]"></i> SMART TRAFFIC LIVE FEED (A, B, C)
                        </div>
                        <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${status === 'IDLE' ? 'bg-gray-700 text-gray-400' : 'bg-green-500/20 text-green-500 animate-pulse'}`}>
                            {status}
                        </span>
                    </div>
                    
                    <div className="relative aspect-video bg-black flex items-center justify-center group">
                        {frameB64 ? (
                            <>
                                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">LIVE</span>
                                </div>
                                <img src={`data:image/jpeg;base64,${frameB64}`} className="w-full h-full object-contain" alt="Feed" />
                            </>
                        ) : (
                            <div className="text-center space-y-4 opacity-40 group-hover:opacity-60 transition-opacity">
                                <i className="fas fa-video-slash text-6xl"></i>
                                <p className="text-sm font-medium uppercase tracking-widest">Awaiting feed initialization</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-[#252525]">
                        <form onSubmit={handleStartAnalysis} className="flex flex-wrap gap-4 items-center">
                            <div className="flex gap-2 p-2 bg-[#1c1c1c] rounded-xl border border-[#3a3a3a]">
                                <input type="file" ref={fileARef} hidden accept="video/mp4" />
                                <button type="button" onClick={() => fileARef.current.click()} className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] rounded-lg text-xs font-bold transition-colors">CAM A</button>
                                
                                <input type="file" ref={fileBRef} hidden accept="video/mp4" />
                                <button type="button" onClick={() => fileBRef.current.click()} className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] rounded-lg text-xs font-bold transition-colors">CAM B</button>
                                
                                <input type="file" ref={fileCRef} hidden accept="video/mp4" />
                                <button type="button" onClick={() => fileCRef.current.click()} className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] rounded-lg text-xs font-bold transition-colors">CAM C</button>
                            </div>

                            {!isAnalyzing ? (
                                <div className="flex gap-4">
                                    <button type="submit" className="px-8 py-3 bg-[#ff4d00] hover:bg-[#ff6a26] text-white rounded-xl text-sm font-black transition-all shadow-[0_0_20px_rgba(255,77,0,0.3)] flex items-center gap-2">
                                        <i className="fas fa-play"></i> START ANALYSIS
                                    </button>
                                    <button type="button" onClick={handleSampleData} className="px-8 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-xl text-sm font-black transition-all border border-[#3a3a3a] flex items-center gap-2">
                                        <i className="fas fa-database text-[#ff4d00]"></i> SAMPLE DATA
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={handleStopAnalysis} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black transition-all flex items-center gap-2">
                                    <i className="fas fa-stop"></i> STOP
                                </button>
                            )}
                        </form>
                    </div>
                </section>

                {/* Coordinated Strategy Table */}
                <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-[#3a3a3a] bg-[#2d2d2d] flex items-center gap-2 font-bold text-sm">
                        <i className="fas fa-project-diagram text-[#ff4d00]"></i> COORDINATED STRATEGY
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#1c1c1c] text-gray-400 text-[10px] uppercase tracking-widest font-black">
                                <tr>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4">Timing</th>
                                    <th className="px-6 py-4">State</th>
                                    <th className="px-6 py-4">Reasoning</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#3a3a3a]">
                                {['A', 'B', 'C'].map(loc => (
                                    <tr key={loc} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-bold">Location {loc}</td>
                                        <td className="px-6 py-4 font-mono text-[#ff4d00]">{signals[loc].time_remaining}s</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black ${
                                                signals[loc].state === 'GREEN' ? 'bg-green-500/20 text-green-500' :
                                                signals[loc].state === 'YELLOW' ? 'bg-yellow-500/20 text-yellow-500' :
                                                'bg-red-500/20 text-red-500'
                                            }`}>
                                                {signals[loc].state}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-xs">{reasons[loc] || 'Maintain balance'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* Right Side: Signals and Intelligence */}
            <div className="space-y-6">
                {/* Traffic Lights Visual */}
                <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl">
                    <div className="text-center mb-6">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Signal Status</h3>
                    </div>
                    <div className="flex justify-around items-end h-64">
                        {['A', 'B', 'C'].map(loc => (
                            <div key={loc} className={`flex flex-col items-center gap-4 ${emergency && (loc === 'B') ? 'animate-emergency' : ''}`}>
                                <span className="text-[10px] font-black text-gray-400">CAM {loc}</span>
                                <div className="w-12 p-2 bg-[#111] rounded-3xl border-2 border-[#333] flex flex-col gap-2 shadow-inner">
                                    <div className={`w-7 h-7 rounded-full transition-all duration-300 ${signals[loc].state === 'RED' ? 'bg-red-600 shadow-[0_0_15px_#dc2626]' : 'bg-[#222]'}`}></div>
                                    <div className={`w-7 h-7 rounded-full transition-all duration-300 ${signals[loc].state === 'YELLOW' ? 'bg-yellow-500 shadow-[0_0_15px_#eab308]' : 'bg-[#222]'}`}></div>
                                    <div className={`w-7 h-7 rounded-full transition-all duration-300 ${signals[loc].state === 'GREEN' ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : 'bg-[#222]'}`}></div>
                                </div>
                                <div className="bg-black px-2 py-1 rounded font-mono text-[#ff4d00] text-xs border border-[#3a3a3a]">
                                    {signals[loc].time_remaining}s
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Alerts Panel */}
                <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl">
                    <div className="flex items-center gap-2 font-bold text-sm mb-4">
                        <i className="fas fa-bolt text-yellow-500"></i> ACTIVE ALERTS
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {alerts.length > 0 ? alerts.map((alert, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border flex items-start gap-3 ${alert.includes('🚨') ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                                <i className={`fas ${alert.includes('🚨') ? 'fa-radiation-alt text-red-500' : 'fa-exclamation-triangle text-yellow-500'} mt-1`}></i>
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest">{alert.includes('🚨') ? 'Emergency' : 'Incident'}</h4>
                                    <p className="text-xs text-gray-300 leading-relaxed">{alert}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="h-24 flex items-center justify-center border border-dashed border-[#3a3a3a] rounded-xl text-gray-500 text-xs font-medium uppercase tracking-widest">
                                No active incidents
                            </div>
                        )}
                    </div>
                </section>

                {/* TRAE Reasoning */}
                <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl flex flex-col h-64">
                    <div className="flex items-center gap-2 font-bold text-sm mb-4">
                        <i className="fas fa-microchip text-[#ff4d00]"></i> TRAE REASONING
                    </div>
                    <div ref={logsEndRef} className="flex-1 bg-black/40 rounded-xl p-4 font-mono text-[10px] overflow-y-auto space-y-2 custom-scrollbar">
                        {logs.map((log, idx) => (
                            <div key={idx} className={`flex gap-3 ${log.includes('EMERGENCY') || log.includes('🚨') ? 'text-red-400' : log.includes('OPTIMIZATION') ? 'text-yellow-400' : 'text-gray-400'}`}>
                                <span className="opacity-30">{new Date().toLocaleTimeString([], { hour12: false })}</span>
                                <span>{log}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Simulation Controls */}
                <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl">
                    <div className="flex items-center gap-2 font-bold text-sm mb-4">
                        <i className="fas fa-flask text-[#ff4d00]"></i> SIMULATION
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setRemoteScenario('normal')} className="py-2 bg-[#1c1c1c] hover:bg-[#333] rounded-lg text-[10px] font-black transition-all border border-[#3a3a3a]">NORMAL</button>
                        <button onClick={() => setRemoteScenario('congestion')} className="py-2 bg-[#1c1c1c] hover:bg-[#333] rounded-lg text-[10px] font-black transition-all border border-[#3a3a3a] text-yellow-500">CONGESTION</button>
                        <button onClick={() => setRemoteScenario('accident')} className="py-2 bg-[#1c1c1c] hover:bg-[#333] rounded-lg text-[10px] font-black transition-all border border-[#3a3a3a] text-red-500">ACCIDENT</button>
                    </div>
                    <div className="mt-4 p-2 bg-black/40 rounded border border-[#3a3a3a] text-center">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Current: </span>
                        <span className="text-[10px] font-black text-[#ff4d00]">{scenario}</span>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TrafficMonitoring;
