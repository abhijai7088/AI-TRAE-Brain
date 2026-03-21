import React, { useState, useEffect } from "react";
import TrafficMonitoring from "./TrafficMonitoring";
import PotholeMonitoring from "./PotholeMonitoring";
import SuspiciousMonitoring from "./SuspiciousMonitoring";
import AdminPanel from "./AdminPanel";
import "./Dashboard.css";

const Dashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState("traffic");
    const [wsStatus, setWsStatus] = useState("disconnected");

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        const wsUrl = `${protocol}//${host}/ws`;
        
        console.log(`Connecting to WebSocket at: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            setWsStatus("connected");
            console.log('Connected to WebSocket');
        };
        
        ws.onclose = () => {
            setWsStatus("disconnected");
            console.log('WebSocket disconnected. Retrying in 3s...');
        };

        window.dashboardWs = ws; // Make it globally accessible for components

        return () => {
            ws.close();
        };
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case "traffic":
                return <TrafficMonitoring />;
            case "pothole":
                return <PotholeMonitoring />;
            case "suspicious":
                return <SuspiciousMonitoring />;
            case "admin":
                return <AdminPanel />;
            default:
                return <TrafficMonitoring />;
        }
    };

    return (
        <div className="dashboard-container pt-24 min-h-screen bg-[#1c1c1c] text-white">
            <div className="max-w-[1400px] mx-auto px-6">
                <header className="flex justify-between items-center mb-8 bg-[#2a2a2a] p-4 rounded-xl border border-[#3a3a3a]">
                    <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></div>
                        <h1 className="text-xl font-bold tracking-tighter">AI-TRAE BRAIN <span className="text-xs font-normal text-gray-400 ml-2 uppercase tracking-widest">{wsStatus}</span></h1>
                        <button 
                            onClick={onLogout}
                            className="ml-4 px-3 py-1 bg-[#1c1c1c] hover:bg-red-500/10 text-gray-500 hover:text-red-500 border border-[#3a3a3a] hover:border-red-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <i className="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>

                    <nav className="flex bg-[#1c1c1c] p-1 rounded-lg border border-[#3a3a3a]">
                        <button 
                            onClick={() => setActiveTab('traffic')} 
                            className={`px-6 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${activeTab === 'traffic' ? 'bg-[#2a2a2a] text-[#ff4d00]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <i className="fas fa-traffic-light"></i> Traffic
                        </button>
                        <button 
                            onClick={() => setActiveTab('pothole')} 
                            className={`px-6 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${activeTab === 'pothole' ? 'bg-[#2a2a2a] text-[#ff4d00]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <i className="fas fa-road"></i> Potholes
                        </button>
                        <button 
                            onClick={() => setActiveTab('suspicious')} 
                            className={`px-6 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${activeTab === 'suspicious' ? 'bg-[#2a2a2a] text-[#ff4d00]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <i className="fas fa-user-shield"></i> Suspicious
                        </button>
                        <button 
                            onClick={() => setActiveTab('admin')} 
                            className={`px-6 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${activeTab === 'admin' ? 'bg-[#2a2a2a] text-[#ff4d00]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <i className="fas fa-user-cog"></i> Admin
                        </button>
                    </nav>
                </header>

                <main>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
