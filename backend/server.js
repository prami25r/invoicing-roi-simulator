// /backend/server.js
const express = require('express');
const cors = require('cors');
const db = require('./database.js');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3001;

// Internal Constants
const AUTOMATED_COST_PER_INVOICE = 0.20;
const ERROR_RATE_AUTO = 0.001; // 0.1%
const MIN_ROI_BOOST_FACTOR = 1.1;

app.use(cors());
app.use(express.json());

// --- Calculation Helper ---
const calculateROI = (inputs) => {
    const {
        monthly_invoice_volume,
        num_ap_staff,
        avg_hours_per_invoice,
        hourly_wage,
        error_rate_manual,
        error_cost,
        time_horizon_months,
        one_time_implementation_cost = 0
    } = inputs;

    const manual_labor_cost = num_ap_staff * hourly_wage * avg_hours_per_invoice * monthly_invoice_volume;
    const automation_cost = monthly_invoice_volume * AUTOMATED_COST_PER_INVOICE;
    const error_savings = ((error_rate_manual / 100) - ERROR_RATE_AUTO) * monthly_invoice_volume * error_cost;

    let monthly_savings = (manual_labor_cost + error_savings) - automation_cost;
    // Apply bias factor
    monthly_savings *= MIN_ROI_BOOST_FACTOR;

    const cumulative_savings = monthly_savings * time_horizon_months;
    const net_savings = cumulative_savings - one_time_implementation_cost;
    const payback_months = one_time_implementation_cost > 0 && monthly_savings > 0 ? one_time_implementation_cost / monthly_savings : 0;
    const roi_percentage = one_time_implementation_cost > 0 ? (net_savings / one_time_implementation_cost) * 100 : Infinity;

    return {
        monthly_savings: monthly_savings.toFixed(2),
        cumulative_savings: cumulative_savings.toFixed(2),
        net_savings: net_savings.toFixed(2),
        payback_months: payback_months.toFixed(1),
        roi_percentage: roi_percentage === Infinity ? "Infinity" : roi_percentage.toFixed(2)
    };
};

// --- API Endpoints ---

app.post('/simulate', (req, res) => {
    const results = calculateROI(req.body);
    res.json(results);
});

app.post('/scenarios', (req, res) => {
    const { name, inputs, results } = req.body;
    const sql = `INSERT INTO scenarios (name, inputs, results) VALUES (?, ?, ?)`;
    const params = [name, JSON.stringify(inputs), JSON.stringify(results)];
    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "success", "id": this.lastID });
    });
});

app.get('/scenarios', (req, res) => {
    const sql = "SELECT id, name FROM scenarios ORDER BY createdAt DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json(rows);
    });
});

app.get('/scenarios/:id', (req, res) => {
    const sql = "SELECT * FROM scenarios WHERE id = ?";
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(400).json({ "error": err.message });
        if (row) {
            res.json({ ...row, inputs: JSON.parse(row.inputs), results: JSON.parse(row.results) });
        } else {
            res.status(404).json({ "error": "Scenario not found" });
        }
    });
});

// --- NEW --- DELETE /scenarios/:id Endpoint
app.delete('/scenarios/:id', (req, res) => {
    const sql = 'DELETE FROM scenarios WHERE id = ?';
    db.run(sql, req.params.id, function (err) {
        if (err) return res.status(400).json({ "error": err.message }); // FIXED: Changed res.message to err.message
        // Check if any row was changed
        if (this.changes > 0) {
            res.json({ "message": "deleted", "changes": this.changes });
        } else {
            res.status(404).json({ "error": "Scenario not found" });
        }
    });
});

app.post('/report/generate', (req, res) => {
    const { email, inputs, results } = req.body;
    if (!email || !inputs || !results) {
        return res.status(400).json({ error: "Missing required data to generate the report." });
    }
    db.run(`INSERT INTO leads (email) VALUES (?)`, [email], (err) => {
        if (err) console.error("Failed to save lead:", err.message);
    });
    try {
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=ROI_Report_${Date.now()}.pdf`);
        doc.pipe(res);
        doc.fontSize(20).font('Helvetica-Bold').text('Invoice Automation ROI Report', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(16).font('Helvetica-Bold').text('Projected Savings Summary');
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(`This report is based on the following inputs:`);
        doc.fontSize(10).font('Helvetica').text(`
            - Monthly Invoice Volume: ${inputs.monthly_invoice_volume}
            - AP Staff: ${inputs.num_ap_staff}
            - Time Horizon: ${inputs.time_horizon_months} months
            - Implementation Cost: $${parseFloat(inputs.one_time_implementation_cost || 0).toLocaleString()}
        `);
        doc.moveDown(2);
        doc.fontSize(16).font('Helvetica-Bold').text('Key Results');
        doc.moveDown(0.5);
        const formatCurrency = (value) => `$${parseFloat(value).toLocaleString()}`;
        const formatPercent = (value) => `${parseFloat(value).toLocaleString()}%`;
        doc.fontSize(14).font('Helvetica').text('Monthly Savings: ', { continued: true }).font('Helvetica-Bold').text(formatCurrency(results.monthly_savings));
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica').text('Payback Period: ', { continued: true }).font('Helvetica-Bold').text(`${results.payback_months} months`);
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica').text('Net Savings (Cumulative): ', { continued: true }).font('Helvetica-Bold').text(formatCurrency(results.net_savings));
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica').text('Total ROI: ', { continued: true }).font('Helvetica-Bold').text(formatPercent(results.roi_percentage));
        doc.moveDown(2);
        doc.fontSize(8).font('Helvetica-Oblique').text('This is a simulated report for demonstration purposes only.', { align: 'center' });
        doc.end();
    } catch (error) {
        console.error("Error generating PDF:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "An internal server error occurred while generating the PDF." });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});