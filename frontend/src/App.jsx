// /frontend/src/App.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

const API_URL = 'http://localhost:3001';

// Debounce helper function
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

// Frontend constant for chart calculation
const AUTOMATED_COST_PER_INVOICE = 0.20;

function App() {
    // --- STATE MANAGEMENT ---
    const [inputs, setInputs] = useState({
        monthly_invoice_volume: 2000,
        num_ap_staff: 3,
        avg_hours_per_invoice: 0.17,
        hourly_wage: 30,
        error_rate_manual: 0.5,
        error_cost: 100,
        time_horizon_months: 36,
        one_time_implementation_cost: 50000,
        scenario_name: 'Q4_Pilot',
    });

    const [results, setResults] = useState(null);
    const [scenarios, setScenarios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [chartData, setChartData] = useState([]);

    // --- API CALLS & LOGIC ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const processedValue = e.target.type === 'number' ? Math.max(0, parseFloat(value) || 0) : value;
        setInputs(prev => ({ ...prev, [name]: processedValue }));
    };

    const calculateChartData = (currentInputs) => {
        const { monthly_invoice_volume, num_ap_staff, avg_hours_per_invoice, hourly_wage, error_rate_manual, error_cost } = currentInputs;
        const manual_labor_cost = num_ap_staff * hourly_wage * avg_hours_per_invoice * monthly_invoice_volume;
        const manual_error_cost = (error_rate_manual / 100) * monthly_invoice_volume * error_cost;
        const total_manual_cost = manual_labor_cost + manual_error_cost;
        const automation_cost = monthly_invoice_volume * AUTOMATED_COST_PER_INVOICE;

        setChartData([
            { name: 'Monthly Cost', 'Manual Process': total_manual_cost, 'Automated Process': automation_cost }
        ]);
    };

    const fetchSimulation = async (currentInputs) => {
        if (currentInputs.monthly_invoice_volume <= 0 || currentInputs.num_ap_staff <= 0) {
            setResults(null);
            setIsLoading(false);
            return;
        }
        try {
            setError(null);
            setIsLoading(true);
            const res = await axios.post(`${API_URL}/simulate`, currentInputs);
            setResults(res.data);
            calculateChartData(currentInputs); // Calculate data for charts
        } catch (err) {
            console.error("Error fetching simulation:", err);
            setError("Could not calculate results. Please ensure the backend server is running correctly.");
            setResults(null);
        } finally {
            setIsLoading(false);
        }
    };

    const debouncedFetch = useCallback(debounce(fetchSimulation, 500), []);

    useEffect(() => {
        debouncedFetch(inputs);
    }, [inputs, debouncedFetch]);

    useEffect(() => {
        fetchScenarios();
    }, []);

    const fetchScenarios = async () => {
        try {
            const res = await axios.get(`${API_URL}/scenarios`);
            if (Array.isArray(res.data)) {
                setScenarios(res.data);
            }
        } catch (error) {
            console.error("Error fetching scenarios:", error);
        }
    };

    const handleSaveScenario = async () => {
        if (!inputs.scenario_name) return alert("Please enter a name for the scenario.");
        try {
            await axios.post(`${API_URL}/scenarios`, { name: inputs.scenario_name, inputs, results });
            alert('Scenario saved!');
            fetchScenarios();
        } catch (error) {
            console.error("Error saving scenario:", error);
        }
    };

    const handleLoadScenario = async (id) => {
        try {
            const res = await axios.get(`${API_URL}/scenarios/${id}`);
            setInputs(res.data.inputs);
            setResults(res.data.results);
        } catch (error) {
            console.error("Error loading scenario:", error);
        }
    };
    
    const handleDownloadReport = async (e) => {
        e.preventDefault();
        if (!email) return alert('Please enter your email.');
        try {
            const response = await axios.post(`${API_URL}/report/generate`, { email, inputs, results }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'ROI-Report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            setIsModalOpen(false);
            setEmail('');
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report.');
        }
    };
    
    // --- RENDER ---
    const roiForGauge = [{ value: Math.min(parseFloat(results?.roi_percentage) || 0, 500) }]; // Cap at 500 for visual appeal

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-4 sm:p-8">
            <div className="w-full max-w-7xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-blue-700">Invoicing ROI Simulator</h1>
                    <p className="text-lg text-gray-600 mt-2">See how much your company can save by automating invoicing</p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg h-fit">
                        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Your Business Metrics</h2>
                        <div className="space-y-4">
                            {/* Input fields remain the same */}
                             <div>
                                <label htmlFor="monthly_invoice_volume" className="text-sm font-medium">Monthly Invoice Volume</label>
                                <input type="number" name="monthly_invoice_volume" value={inputs.monthly_invoice_volume} onChange={handleInputChange} min="0" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label htmlFor="num_ap_staff" className="text-sm font-medium">Number of AP Staff</label>
                                <input type="number" name="num_ap_staff" value={inputs.num_ap_staff} onChange={handleInputChange} min="0" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                             <div>
                                <label htmlFor="avg_hours_per_invoice" className="text-sm font-medium">Average Hours per Invoice</label>
                                <input type="number" name="avg_hours_per_invoice" value={inputs.avg_hours_per_invoice} onChange={handleInputChange} min="0" step="0.01" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label htmlFor="hourly_wage" className="text-sm font-medium">Hourly Wage ($)</label>
                                <input type="number" name="hourly_wage" value={inputs.hourly_wage} onChange={handleInputChange} min="0" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                             <div>
                                <label htmlFor="error_rate_manual" className="text-sm font-medium">Manual Error Rate (%)</label>
                                <input type="number" name="error_rate_manual" value={inputs.error_rate_manual} onChange={handleInputChange} min="0" step="0.01" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label htmlFor="error_cost" className="text-sm font-medium">Error Cost ($)</label>
                                <input type="number" name="error_cost" value={inputs.error_cost} onChange={handleInputChange} min="0" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label htmlFor="time_horizon_months" className="text-sm font-medium">Projection Period (Months)</label>
                                <input type="number" name="time_horizon_months" value={inputs.time_horizon_months} onChange={handleInputChange} min="0" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                             <div>
                                <label htmlFor="one_time_implementation_cost" className="text-sm font-medium">One-Time Implementation Cost ($)</label>
                                <input type="number" name="one_time_implementation_cost" value={inputs.one_time_implementation_cost} onChange={handleInputChange} min="0" className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                        </div>
                        <div className="mt-8">
                            <h3 className="text-xl font-semibold mb-3 border-t pt-4">Manage Scenarios</h3>
                            <div className="flex gap-2">
                                <input type="text" name="scenario_name" placeholder="Scenario Name" value={inputs.scenario_name} onChange={handleInputChange} className="flex-grow p-2 border rounded-md"/>
                                <button onClick={handleSaveScenario} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition">Save</button>
                            </div>
                            <div className="mt-4">
                                <h4 className="font-semibold mb-2">Load Scenario</h4>
                                <ul className="space-y-1 max-h-32 overflow-y-auto">
                                    {scenarios.map(s => <li key={s.id} onClick={() => handleLoadScenario(s.id)} className="text-blue-600 cursor-pointer hover:underline text-sm">{s.name}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-3 bg-white p-8 rounded-xl shadow-2xl">
                        <h2 className="text-3xl font-bold text-center mb-6">Automation Impact</h2>
                        {isLoading ? <p className="text-center text-gray-500">Calculating...</p> : 
                         error ? <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg"><p className="font-bold">An Error Occurred</p><p className="text-sm">{error}</p></div> :
                         results ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-green-50 p-6 rounded-lg text-center">
                                        <p className="text-lg text-green-800">Monthly Savings</p>
                                        <p className="text-5xl font-bold text-green-600">${parseFloat(results.monthly_savings).toLocaleString()}</p>
                                    </div>
                                     <div className="bg-blue-50 p-6 rounded-lg text-center">
                                        <p className="text-lg text-blue-800">Payback Period</p>
                                        <p className="text-5xl font-bold text-blue-600">{results.payback_months}<span className="text-3xl"> mos</span></p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                    <div className="h-64">
                                        <h3 className="text-center font-semibold text-gray-700 mb-2">Monthly Cost Comparison</h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                                <XAxis dataKey="name" />
                                                <YAxis tickFormatter={(value) => `$${(value/1000)}k`} />
                                                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`} />
                                                <Legend />
                                                <Bar dataKey="Manual Process" fill="#ef4444" />
                                                <Bar dataKey="Automated Process" fill="#22c55e" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="h-64 flex flex-col items-center justify-center">
                                        <h3 className="text-center font-semibold text-gray-700 mb-2">Total ROI ({inputs.time_horizon_months} mos)</h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadialBarChart innerRadius="60%" outerRadius="100%" data={roiForGauge} startAngle={180} endAngle={0}>
                                                <PolarAngleAxis type="number" domain={[0, 500]} angleAxisId={0} tick={false} />
                                                <RadialBar background dataKey="value" cornerRadius={10} angleAxisId={0} data={roiForGauge} fill="#3b82f6" />
                                                <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-gray-700">
                                                    {parseFloat(results.roi_percentage).toLocaleString()}%
                                                </text>
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="pt-6 border-t">
                                    <button onClick={() => setIsModalOpen(true)} className="w-full px-8 py-3 bg-red-600 text-white font-bold rounded-lg text-lg hover:bg-red-700 transition">Download Full Report (PDF)</button>
                                </div>
                            </div>
                        ) : <p className="text-center text-gray-500">Enter valid business data to see the results.</p>}
                    </div>
                </main>

                <footer className="text-center mt-12 text-gray-500 text-sm">
                    <p>Prototype for demonstration purposes.</p>
                </footer>
            </div>
            
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                        <h3 className="text-2xl font-bold mb-4">Get Your Free Report</h3>
                        <form onSubmit={handleDownloadReport}>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@company.com" required className="w-full p-3 border rounded-md mb-4"/>
                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Download</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
