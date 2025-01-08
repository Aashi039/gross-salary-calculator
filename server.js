const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const excel = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
// app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/salaryDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define Employee Schema
const employeeSchema = new mongoose.Schema({
    name: String,
    id: String,
    ctc: Number,
    grossSalary: Number,
});

// Create Employee Model
const Employee = mongoose.model('Employee', employeeSchema);

// Calculate Gross Salary Endpoint
app.post('/calculate', async (req, res) => {
    const { employeeName, employeeId, ctc } = req.body;

    try {
        // Calculate gross salary (example: 70% of CTC)
        const grossSalary = (ctc * 0.7).toFixed(2);

        // Save to the database
        const newEmployee = new Employee({
            name: employeeName,
            id: employeeId,
            ctc,
            grossSalary,
        });
        await newEmployee.save();

        // Respond with calculated data
        res.json({
            success: true,
            employeeName,
            employeeId,
            grossSalary,
        });
    } catch (error) {
        console.error('Error calculating gross salary:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Generate PDF Endpoint
app.get('/download-pdf', async (req, res) => {
    try {
        const employees = await Employee.find();

        // Create a PDF document
        const doc = new PDFDocument();
        const filePath = path.join(__dirname, 'employees.pdf');
        doc.pipe(fs.createWriteStream(filePath));

        doc.fontSize(18).text('Employee Salary Details', { align: 'center' });
        doc.moveDown();

        employees.forEach((emp) => {
            doc.fontSize(12).text(
                `Name: ${emp.name}, ID: ${emp.id}, Gross Salary: ${emp.grossSalary}`
            );
            doc.moveDown();
        });

        doc.end();

        // Send the PDF as a download
        doc.on('finish', () => res.download(filePath));
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Failed to generate PDF');
    }
});

// Generate Excel Endpoint
app.get('/download-excel', async (req, res) => {
    try {
        const employees = await Employee.find();

        // Create Excel workbook and worksheet
        const workbook = excel.utils.book_new();
        const worksheet = excel.utils.json_to_sheet(
            employees.map((emp) => ({
                Name: emp.name,
                ID: emp.id,
                CTC: emp.ctc,
                GrossSalary: emp.grossSalary,
            }))
        );

        excel.utils.book_append_sheet(workbook, worksheet, 'Employees');
        const filePath = path.join(__dirname, 'employees.xlsx');
        excel.writeFile(workbook, filePath);

        // Send the Excel file as a download
        res.download(filePath);
    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).send('Failed to generate Excel');
    }
});

// Start Server
app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
