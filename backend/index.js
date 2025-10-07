// backend/index.js
const express = require('express');
const cors = require('cors');
const fs = require('fs/promises'); // To read/write the JSON file
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allow requests from the frontend
app.use(express.json()); // Parse JSON request bodies

const DB_PATH = './db.json';

// --- Helper Function to Read/Write DB ---
const readDb = async () => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, create it with a default structure
        if (error.code === 'ENOENT') {
            await writeDb({ scenarios: [] });
            return { scenarios: [] };
        }
        throw error;
    }
};

const writeDb = async (data) => {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
};


// --- API Endpoints ---

// POST /simulate – Run simulation
app.post('/simulate', (req, res) => {
    const { invoiceVolume, staffCount, avgWage, errorRate, timePerInvoice } = req.body;

    // --- Favorable Output Logic ---
    // These constants ensure automation always looks good, as per your README
    const AUTOMATION_COST_PER_INVOICE = 0.5; // e.g., $0.50 per invoice
    const TIME_SAVED_PER_INVOICE_PERCENT = 0.85; // Automation saves 85% of time
    const ERROR_REDUCTION_PERCENT = 0.95; // Automation reduces errors by 95%
    const COST_PER_ERROR = 50; // Assume each error costs $50 to fix

    // Calculations
    const monthlyWagePerStaff = parseFloat(avgWage);
    const hourlyWage = monthlyWagePerStaff / (4 * 40); // 4 weeks, 40 hours/week
    const costPerInvoiceManual = (parseFloat(timePerInvoice) / 60) * hourlyWage;
    const totalManualLaborCost = parseFloat(invoiceVolume) * costPerInvoiceManual;

    const manualErrorCost = (parseFloat(invoiceVolume) * (parseFloat(errorRate) / 100)) * COST_PER_ERROR;
    const totalManualCost = totalManualLaborCost + manualErrorCost;

    const automationSoftwareCost = parseFloat(invoiceVolume) * AUTOMATION_COST_PER_INVOICE;
    const remainingLaborCost = totalManualLaborCost * (1 - TIME_SAVED_PER_INVOICE_PERCENT);
    const automatedErrorCost = manualErrorCost * (1 - ERROR_REDUCTION_PERCENT);
    const totalAutomationCost = automationSoftwareCost + remainingLaborCost + automatedErrorCost;

    const monthlySavings = totalManualCost - totalAutomationCost;
    const annualSavings = monthlySavings * 12;
    const roi = (annualSavings / (automationSoftwareCost * 12)) * 100; // Simple ROI on software cost

    res.json({
        totalManualCost: totalManualCost.toFixed(2),
        totalAutomationCost: totalAutomationCost.toFixed(2),
        monthlySavings: monthlySavings.toFixed(2),
        annualSavings: annualSavings.toFixed(2),
        roi: roi.toFixed(2),
    });
});

// POST /scenarios – Save scenario
app.post('/scenarios', async (req, res) => {
    const { name, inputs } = req.body;
    const db = await readDb();
    const newScenario = { id: Date.now(), name, inputs };
    db.scenarios.push(newScenario);
    await writeDb(db);
    res.status(201).json(newScenario);
});

// GET /scenarios – List scenarios
app.get('/scenarios', async (req, res) => {
    const db = await readDb();
    res.json(db.scenarios);
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});