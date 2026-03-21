import React, { useState, useEffect } from "react";

const AdminPanel = () => {
    const [summary, setSummary] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTicket, setNewTicket] = useState({ dashboard: "traffic", issue: "", severity: "MEDIUM" });
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyMessage, setReplyMessage] = useState("");

    const fetchAdminData = async () => {
        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            const [summaryRes, ticketsRes] = await Promise.all([
                fetch(`${host}/admin/summary`),
                fetch(`${host}/admin/tickets`)
            ]);
            setSummary(await summaryRes.json());
            setTickets(await ticketsRes.json());
        } catch (err) {
            console.error("Admin fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
        const interval = setInterval(fetchAdminData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('dashboard', newTicket.dashboard);
        fd.append('issue', newTicket.issue);
        fd.append('severity', newTicket.severity);

        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            await fetch(`${host}/admin/tickets`, { method: 'POST', body: fd });
            setNewTicket({ ...newTicket, issue: "" });
            fetchAdminData();
        } catch (err) { console.error(err); }
    };

    const handleReply = async (ticketId) => {
        const fd = new FormData();
        fd.append('message', replyMessage);

        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            await fetch(`${host}/admin/tickets/${ticketId}/reply`, { method: 'POST', body: fd });
            setReplyingTo(null);
            setReplyMessage("");
            fetchAdminData();
        } catch (err) { console.error(err); }
    };

    const handleClose = async (ticketId) => {
        try {
            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            await fetch(`${host}/admin/tickets/${ticketId}/close`, { method: 'POST' });
            fetchAdminData();
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="text-center p-20 text-gray-500 uppercase tracking-widest animate-pulse">Initializing Admin Hub...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* System Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-[#3a3a3a] shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Traffic Node</h3>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${summary.traffic.status === 'running' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>
                            {summary.traffic.status.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <i className="fas fa-traffic-light text-3xl text-[#ff4d00]"></i>
                        <div>
                            <div className="text-xl font-black">{summary.traffic.emergency ? 'EMERGENCY' : 'NORMAL'}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Active Strategy</div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-[#3a3a3a] shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pothole Pipeline</h3>
                        <span className="text-[8px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{summary.potholes.length} ACTIVE RUNS</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <i className="fas fa-road text-3xl text-yellow-500"></i>
                        <div>
                            <div className="text-xl font-black">{summary.potholes.length > 0 ? summary.potholes[0].status.toUpperCase() : 'IDLE'}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Main Thread Status</div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-[#3a3a3a] shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Security Hub</h3>
                        <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{summary.suspicious.length} ACTIVE RUNS</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <i className="fas fa-user-shield text-3xl text-red-500"></i>
                        <div>
                            <div className="text-xl font-black">{summary.suspicious.length > 0 ? summary.suspicious[0].status.toUpperCase() : 'SECURE'}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Surveillance Mode</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Ticket Creation */}
                <div className="lg:col-span-1">
                    <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl sticky top-24">
                        <div className="flex items-center gap-2 font-bold text-sm mb-6">
                            <i className="fas fa-ticket-alt text-[#ff4d00]"></i> GENERATE TICKET
                        </div>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Target Dashboard</label>
                                <select 
                                    value={newTicket.dashboard}
                                    onChange={(e) => setNewTicket({ ...newTicket, dashboard: e.target.value })}
                                    className="w-full bg-[#1c1c1c] border border-[#3a3a3a] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#ff4d00] transition-colors appearance-none"
                                >
                                    <option value="traffic">Traffic Monitoring</option>
                                    <option value="pothole">Pothole Detection</option>
                                    <option value="suspicious">Suspicious Activity</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Issue Severity</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['LOW', 'MEDIUM', 'HIGH'].map(lvl => (
                                        <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => setNewTicket({ ...newTicket, severity: lvl })}
                                            className={`py-2 rounded-lg text-[10px] font-black border transition-all ${
                                                newTicket.severity === lvl 
                                                ? 'bg-[#ff4d00] border-[#ff4d00] text-white shadow-[0_0_10px_rgba(255,77,0,0.3)]' 
                                                : 'bg-[#1c1c1c] border-[#3a3a3a] text-gray-500 hover:border-gray-500'
                                            }`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Description</label>
                                <textarea 
                                    value={newTicket.issue}
                                    onChange={(e) => setNewTicket({ ...newTicket, issue: e.target.value })}
                                    className="w-full bg-[#1c1c1c] border border-[#3a3a3a] rounded-xl px-4 py-3 text-sm font-bold h-32 resize-none focus:outline-none focus:border-[#ff4d00] transition-colors"
                                    placeholder="Describe the issue or feedback..."
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full py-4 bg-[#ff4d00] hover:bg-[#ff6a26] text-white rounded-xl text-sm font-black transition-all shadow-[0_0_20px_rgba(255,77,0,0.2)]">
                                SUBMIT TICKET
                            </button>
                        </form>
                    </section>
                </div>

                {/* Ticket List & Replies */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] p-6 shadow-xl min-h-[600px]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2 font-bold text-sm">
                                <i className="fas fa-list-ul text-[#ff4d00]"></i> ACTIVE TICKETS
                            </div>
                            <div className="flex gap-4">
                                <div className="text-[10px] font-black text-gray-500">OPEN: <span className="text-white">{summary.open_tickets}</span></div>
                                <div className="text-[10px] font-black text-gray-500">TOTAL: <span className="text-white">{summary.total_tickets}</span></div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {tickets.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-[#3a3a3a] rounded-2xl text-gray-600">
                                    <i className="fas fa-folder-open text-4xl mb-4"></i>
                                    <p className="text-xs font-black uppercase tracking-widest">No tickets generated yet</p>
                                </div>
                            ) : (
                                tickets.map(ticket => (
                                    <div key={ticket.id} className="bg-[#1c1c1c] rounded-2xl border border-[#3a3a3a] overflow-hidden">
                                        <div className="p-5 border-b border-[#3a3a3a] flex items-center justify-between bg-[#252525]">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-[#ff4d00]">{ticket.id}</span>
                                                <span className="px-2 py-0.5 bg-[#1c1c1c] text-gray-400 rounded text-[8px] font-black uppercase tracking-widest">{ticket.dashboard}</span>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                    ticket.severity === 'HIGH' ? 'bg-red-500/20 text-red-500' :
                                                    ticket.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-500' :
                                                    'bg-blue-500/20 text-blue-500'
                                                }`}>{ticket.severity}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${ticket.status === 'open' ? 'text-green-500' : 'text-gray-500'}`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <p className="text-sm font-bold text-gray-300 leading-relaxed mb-4">{ticket.issue}</p>
                                            
                                            {ticket.replies.length > 0 && (
                                                <div className="space-y-3 mb-4 bg-black/30 p-4 rounded-xl">
                                                    {ticket.replies.map((reply, idx) => (
                                                        <div key={idx} className="flex gap-3 text-xs">
                                                            <div className="w-1 h-auto bg-[#ff4d00] rounded-full"></div>
                                                            <p className="text-gray-400 italic">"{reply}"</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                {replyingTo === ticket.id ? (
                                                    <div className="flex-1 flex gap-2">
                                                        <input 
                                                            autoFocus
                                                            className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-2 text-xs font-bold focus:outline-none focus:border-[#ff4d00]"
                                                            placeholder="Type your reply..."
                                                            value={replyMessage}
                                                            onChange={(e) => setReplyMessage(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleReply(ticket.id)}
                                                        />
                                                        <button onClick={() => handleReply(ticket.id)} className="bg-[#ff4d00] px-4 rounded-lg text-white font-black text-[10px]">SEND</button>
                                                        <button onClick={() => setReplyingTo(null)} className="text-gray-500 text-[10px] font-black px-2">CANCEL</button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => setReplyingTo(ticket.id)}
                                                            className="text-[10px] font-black text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                                                        >
                                                            <i className="fas fa-reply"></i> REPLY
                                                        </button>
                                                        {ticket.status !== 'closed' && (
                                                            <button 
                                                                onClick={() => handleClose(ticket.id)}
                                                                className="text-[10px] font-black text-gray-500 hover:text-red-500 transition-colors flex items-center gap-2"
                                                            >
                                                                <i className="fas fa-check"></i> CLOSE
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
