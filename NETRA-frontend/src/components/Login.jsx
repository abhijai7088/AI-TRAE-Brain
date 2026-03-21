import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = ({ onLogin }) => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        // Use the default credentials specified by the user
        if (userId === "abhi7088" && password === "12345") {
            localStorage.setItem("isAuth", "true");
            onLogin();
            navigate("/dashboard");
        } else {
            setError("Invalid credentials. Access Denied.");
            setTimeout(() => setError(""), 3000);
        }
    };

    return (
        <div className="min-h-screen bg-[#1c1c1c] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ff4d00]/5 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md animate-fadeIn">
                <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-md bg-opacity-80">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#ff4d00]/10 rounded-2xl mb-6 border border-[#ff4d00]/20">
                            <i className="fas fa-shield-alt text-3xl text-[#ff4d00]"></i>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter mb-2">AI-TRAE BRAIN</h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Secure Infrastructure Hub</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Access ID</label>
                            <div className="relative group">
                                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#ff4d00] transition-colors"></i>
                                <input 
                                    type="text" 
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    className="w-full bg-[#1c1c1c] border border-[#3a3a3a] rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-[#ff4d00] transition-all"
                                    placeholder="Enter Access ID"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Secure Password</label>
                            <div className="relative group">
                                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#ff4d00] transition-colors"></i>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#1c1c1c] border border-[#3a3a3a] rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-[#ff4d00] transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-shake">
                                <i className="fas fa-exclamation-circle text-red-500"></i>
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="w-full bg-[#ff4d00] hover:bg-[#ff6a26] text-white py-4 rounded-xl font-black text-sm transition-all shadow-[0_10px_30px_rgba(255,77,0,0.2)] hover:shadow-[0_15px_40px_rgba(255,77,0,0.3)] active:scale-[0.98]"
                        >
                            AUTHORIZE ACCESS
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-[#3a3a3a] text-center">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                            <i className="fas fa-info-circle mr-1"></i> Authorized Personnel Only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
