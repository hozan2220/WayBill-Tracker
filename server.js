const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const ExcelJS = require('exceljs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
dotenv.config();

const app = express();
const PORT = 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://adqkysthhxqeokcihffg.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcWt5c3RoaHhxZW9rY2loZmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NzM5NzgsImV4cCI6MjA3NDQ0OTk3OH0.W9DoajEfc4VL-uvI2w717PBugd1yTE2HjODOkBHHcaM';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcWt5c3RoaHhxZW9rY2loZmZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg3Mzk3OCwiZXhwIjoyMDc0NDQ5OTc4fQ.GVpFUK6Ck3NyRPyYpiBMsAlMyjYKrkZQUtsrPYG3h0Y';

// Supabase server client with service role for database operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Supabase client for verifying user tokens (anon key)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});
// Add email configuration after the Supabase setup
const emailConfig = {
    service: 'gmail',
    auth: {
        user: 'hwzanftah3@gmail.com',
        pass: 'zovsrngkfxuwzrrc' // This is the app password
    }
};

// Create email transporter
const emailTransporter = nodemailer.createTransport(emailConfig);
// Verify email connection on startup
emailTransporter.verify(function(error, success) {
    if (error) {
        console.error('Email transporter verification failed:', error);
    } else {
        console.log('✅ Email transporter is ready to send messages');
    }
});

// Function to send waybill creation email
async function sendWaybillCreationEmail(waybill) {
    try {
        const mailOptions = {
            from: '"Waybill Tracker"',
            to: waybill.recipient, // Assuming recipient field contains email
            subject: `New Waybill Created - ${waybill.id}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF7F00 0%, #FF5500 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
        .waybill-info { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #FF7F00; }
        .info-item { margin: 10px 0; }
        .label { font-weight: bold; color: #FF7F00; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 New Waybill Created</h1>
            <p>Orange Logistics Services</p>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>A new waybill has been created for you. Here are the details:</p>
            
            <div class="waybill-info">
                <div class="info-item">
                    <span class="label">Waybill ID:</span> ${waybill.id}
                </div>
                <div class="info-item">
                    <span class="label">Sender:</span> ${waybill.sender}
                </div>
                <div class="info-item">
                    <span class="label">Recipient:</span> ${waybill.recipient}
                </div>
                <div class="info-item">
                    <span class="label">From:</span> ${waybill.sender_address}
                </div>
                <div class="info-item">
                    <span class="label">To:</span> ${waybill.recipient_address}
                </div>
                <div class="info-item">
                    <span class="label">Driver:</span> ${waybill.driver || 'Not assigned'}
                </div>
                <div class="info-item">
                    <span class="label">Preferred Delivery Date:</span> ${waybill.preferred_date}
                </div>
                <div class="info-item">
                    <span class="label">Status:</span> ${waybill.status}
                </div>
                <div class="info-item">
                    <span class="label">Description:</span> ${waybill.description || 'No description provided'}
                </div>
            </div>
            
            <p>You can track your waybill status through the Waybill Tracker system.</p>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>Waybill Tracker System</p>
            </div>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Waybill creation email sent to ${waybill.recipient}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send waybill creation email:', error);
        return false;
    }
}
// Function to send delivery confirmation email
// Function to send delivery confirmation email
async function sendDeliveryConfirmationEmail(waybill) {
    try {
        // Debug log to see what's in the waybill object
        console.log('Waybill data for email:', waybill);
        
        // Extract sender email with fallbacks for different field names
        const senderEmail = waybill.sender || waybill.sender_email || '';
        
        if (!senderEmail) {
            console.error('❌ No sender email found in waybill:', waybill.id);
            return false;
        }
        
        // Validate email format
        if (!isValidEmail(senderEmail)) {
            console.error('❌ Invalid sender email format:', senderEmail);
            return false;
        }

        const mailOptions = {
            from: '"Waybill Tracker"',
            to: senderEmail,
            subject: `Package Delivered - Waybill ${waybill.id}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3E7B27 0%, #2E5C1D 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
        .delivery-info { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #3E7B27; }
        .info-item { margin: 10px 0; }
        .label { font-weight: bold; color: #3E7B27; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .status-badge { background: #D5F5E3; color: #27AE60; padding: 5px 10px; border-radius: 15px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Package Delivered Successfully</h1>
            <p>Orange Logistics Services</p>
        </div>
        <div class="content">
            <p>Hello ${waybill.sender || 'Sender'},</p>
            <p>Your package has been successfully delivered to the recipient. Here are the delivery details:</p>
            
            <div class="delivery-info">
                <div class="info-item">
                    <span class="label">Waybill ID:</span> ${waybill.id}
                </div>
                <div class="info-item">
                    <span class="label">Recipient:</span> ${waybill.recipient}
                </div>
                <div class="info-item">
                    <span class="label">Delivery Address:</span> ${waybill.recipient_address || waybill.recipientAddress}
                </div>
                <div class="info-item">
                    <span class="label">Driver:</span> ${waybill.driver || 'Not assigned'}
                </div>
                <div class="info-item">
                    <span class="label">Delivery Date:</span> ${new Date().toLocaleDateString()}
                </div>
                <div class="info-item">
                    <span class="label">Status:</span> <span class="status-badge">DELIVERED</span>
                </div>
                <div class="info-item">
                    <span class="label">Package Description:</span> ${waybill.description || 'No description provided'}
                </div>
            </div>
            
            <p>The delivery process has been completed successfully. Thank you for using Our Logistics Services.</p>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>Waybill Tracker System</p>
            </div>
        </div>
    </div>
</body>
</html>
            `
        };

        console.log(`📧 Attempting to send delivery confirmation email to: ${senderEmail}`);
        const info = await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Delivery confirmation email sent to ${senderEmail}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send delivery confirmation email:', error);
        return false;
    }
}

// Function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

const DATA_FILE = path.join(__dirname, 'waybills.json');
const ARCHIVE_FILE = path.join(__dirname, 'archived-waybills.json');

// Store SSE connections
const sseConnections = new Set();

// SSE utility functions
function addSSEConnection(res) {
    sseConnections.add(res);
    
    // Remove connection when client disconnects
    res.on('close', () => {
        sseConnections.delete(res);
    });
}

function broadcastSSE(event, data) {
    const message = `data: ${JSON.stringify({ event, data })}\n\n`;
    
    sseConnections.forEach(res => {
        try {
            res.write(message);
        } catch (error) {
            // Remove dead connections
            sseConnections.delete(res);
        }
    });
}

// Map Supabase row (snake_case) to frontend shape (camelCase)
function mapWaybillRowToClient(row) {
    if (!row) return row;
    return {
        id: row.id,
        sender: row.sender, // This should contain the email address
        recipient: row.recipient,
        senderAddress: row.senderAddress || row.sender_address,
        recipientAddress: row.recipientAddress || row.recipient_address,
        driver: row.driver || '',
        status: row.status,
        preferredDate: row.preferredDate || row.preferred_date,
        description: row.description || '',
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        archivedAt: row.archivedAt || row.archived_at,
        sharepointLink: row.sharepointLink || row.sharepoint_link
    };
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
// Get all users for recipient dropdown
// Get all users for recipient dropdown
// Get all users for recipient dropdown
// Get all users for recipient dropdown
app.get('/api/users', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .rpc('get_all_users');
        
        if (error) throw error;
        
        res.json({
            success: true,
            users: data || []
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve users'
        });
    }
});
// Serve dedicated login page at root
// Serve login page at root, but check if user is already authenticated
// Serve login page at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
function extractToken(req) {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    if (req.query && typeof req.query.token === 'string' && req.query.token) return req.query.token;
    return null;
}


function validateDomainEmail(email) {
    const allowedDomain = '@drd-me.org';
    return email && email.endsWith(allowedDomain);
}
// Auth middleware using Supabase JWT from Authorization: Bearer <token> or ?token=
async function requireAuth(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data || !data.user) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }
        
        // Add domain validation to existing requireAuth
        if (!validateDomainEmail(data.user.email)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Access restricted to @drd-me.org email addresses only' 
            });
        }
        
        req.user = data.user;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
}


// Initialize storage (no-op for Supabase; keep JSON init for backwards compatibility)
async function initializeDataFiles() {
    // No file initialization needed when using Supabase
}

// Read waybills from Supabase
async function readWaybills() {
    try {
        const { data, error } = await supabaseAdmin
            .from('waybills')
            .select('*');
        if (error) throw error;
        return { waybills: data || [] };
    } catch (error) {
        console.error('Error reading waybills from Supabase:', error);
        return { waybills: [] };
    }
}

// Read archived waybills from Supabase
async function readArchivedWaybills() {
    try {
        const { data, error } = await supabaseAdmin
            .from('archived_waybills')
            .select('*');
        if (error) throw error;
        return { waybills: data || [] };
    } catch (error) {
        console.error('Error reading archived waybills from Supabase:', error);
        return { waybills: [] };
    }
}

// Write waybills to JSON file
async function writeWaybills(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing waybills:', error);
        return false;
    }
}

// Write archived waybills to JSON file
async function writeArchivedWaybills(data) {
    try {
        await fs.writeFile(ARCHIVE_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing archived waybills:', error);
        return false;
    }
}

// Generate unique waybill ID
function generateWaybillId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `WB${timestamp}${random}`;
}
// Function to format email to display name
function formatEmailToDisplayName(email) {
    if (!email || !email.includes('@drd-me.org')) {
        return email; // Return as-is if not in expected format
    }
    
    // Extract the part before @drd-me.org
    const namePart = email.split('@')[0];
    
    // Split by dots and capitalize each part
    const nameParts = namePart.split('.');
    const formattedName = nameParts.map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join(' ');
    
    return formattedName;
}

// Function to get user display name (with caching for performance)
const userDisplayNameCache = new Map();

async function getUserDisplayName(email) {
    if (userDisplayNameCache.has(email)) {
        return userDisplayNameCache.get(email);
    }
    
    try {
        const { data, error } = await supabaseAdmin
            .rpc('get_all_users');
        
        if (error) throw error;
        
        const user = data.find(u => u.email === email);
        let displayName = email; // fallback
        
        if (user) {
            // Use display_name from database if available
            displayName = user.display_name || formatEmailToDisplayName(email);
        } else {
            // Fallback to email formatting
            displayName = formatEmailToDisplayName(email);
        }
        
        userDisplayNameCache.set(email, displayName);
        return displayName;
        
    } catch (error) {
        console.error('Error fetching user display name:', error);
        // Fallback to email formatting
        return formatEmailToDisplayName(email);
    }
}
// Generate invoice HTML
// Generate invoice HTML (updated version)
async function generateInvoiceHTML(waybill) {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    // Get display names for sender and recipient
    const senderDisplayName = await getUserDisplayName(waybill.sender);
    const recipientDisplayName = await getUserDisplayName(waybill.recipient);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Waybill Invoice - ${waybill.id}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.3;
            color: #333;
            background: #fff;
            padding: 10px;
            font-size: 12px;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            border: 1px solid #FF7F00;
            overflow: hidden;
        }
        
        .invoice-header {
            background: linear-gradient(135deg, #FF7F00 0%, #FF5500 100%);
            color: white;
            padding: 15px;
            text-align: center;
        }
        
        .invoice-header h1 {
            font-size: 1.8rem;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .invoice-header h2 {
            font-size: 1rem;
            opacity: 0.9;
        }
        
        .invoice-body {
            padding: 15px;
        }
        
        .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .driver-section {
            grid-column: 2;
            grid-row: 1;
        }
        
        .detail-section {
            background: #f8f9fa;
            padding: 10px;
            border-left: 3px solid #FF7F00;
        }
        
        .detail-section h3 {
            color: #FF7F00;
            margin-bottom: 8px;
            font-size: 1rem;
            border-bottom: 1px solid #FF7F00;
            padding-bottom: 3px;
        }
        
        .detail-item {
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
        }
        
        .detail-label {
            font-weight: bold;
            color: #666;
        }
        
        .detail-value {
            color: #333;
            text-align: right;
            max-width: 60%;
            word-wrap: break-word;
        }
        
        .waybill-info {
            background: #fff5e6;
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid #FFE6CC;
        }
        
        .waybill-info h3 {
            color: #FF7F00;
            margin-bottom: 8px;
            font-size: 1.1rem;
        }
        
        .signature-section {
            margin-top: 20px;
            border-top: 1px solid #FF7F00;
            padding-top: 15px;
        }
        
        .signature-section h3 {
            color: #FF7F00;
            margin-bottom: 10px;
            text-align: center;
            font-size: 1.1rem;
        }
        
        .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 10px;
        }
        
        .signature-box {
            text-align: center;
            border: 1px solid #ddd;
            padding: 10px;
            min-height: 80px;
            background: #fafafa;
        }
        
        .signature-box h4 {
            color: #FF7F00;
            margin-bottom: 5px;
            font-size: 0.9rem;
        }
        
        .signature-line {
            border-bottom: 1px solid #333;
            margin: 15px 0 5px 0;
            height: 25px;
        }
        
        .signature-label {
            font-size: 0.8rem;
            color: #666;
            margin-top: 3px;
        }
        
        .invoice-footer {
            background: #f8f9fa;
            padding: 10px;
            text-align: center;
            color: #666;
            border-top: 1px solid #ddd;
            font-size: 10px;
        }
        
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #FF7F00;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(255, 127, 0, 0.3);
            transition: all 0.3s ease;
        }
        
        .print-button:hover {
            background: #FF5500;
            transform: translateY(-2px);
        }
        
        @media print {
            .print-button {
                display: none;
            }
            
            body {
                padding: 0;
                font-size: 11px;
            }
            
            .invoice-container {
                box-shadow: none;
                border: 1px solid #000;
                max-width: 100%;
            }
            
            .invoice-header {
                padding: 10px;
            }
            
            .invoice-body {
                padding: 10px;
            }
            
            .invoice-details {
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .signature-section {
                margin-top: 15px;
                padding-top: 10px;
            }
            
            .signatures {
                gap: 10px;
            }
            
            .signature-box {
                min-height: 60px;
                padding: 8px;
            }
        }
        
        @media (max-width: 768px) {
            .invoice-details {
                grid-template-columns: 1fr;
            }
            
            .driver-section {
                grid-column: 1;
                grid-row: auto;
            }
            
            .signatures {
                grid-template-columns: 1fr;
            }
            
            .invoice-header h1 {
                font-size: 1.5rem;
            }
            
            .invoice-header h2 {
                font-size: 0.9rem;
            }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">🖨️ Print Invoice</button>
    
    <div class="invoice-container">
        <div class="invoice-header">
            <h1>📦 WAYBILL INVOICE</h1>
            <h2>Orange Logistics Services</h2>
        </div>
        
        <div class="invoice-body">
            <div class="invoice-details">
                <div class="detail-section">
                    <h3>👤 Sender</h3>
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${senderDisplayName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value" style="font-size: 10px;">${waybill.sender}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Address:</span>
                        <span class="detail-value">${waybill.sender_address}</span>
                    </div>
                </div>
                
                <div class="detail-section driver-section">
                    <h3>🚚 Driver Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Driver Name:</span>
                        <span class="detail-value"><strong>${waybill.driver || 'Not assigned'}</strong></span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>👤 Recipient</h3>
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${recipientDisplayName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value" style="font-size: 10px;">${waybill.recipient}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Address:</span>
                        <span class="detail-value">${waybill.recipient_address}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section" style="margin-bottom: 15px;">
                <h3>📋 Waybill Info</h3>
                <div class="detail-item">
                    <span class="detail-label">ID:</span>
                    <span class="detail-value"><strong>${waybill.id}</strong></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${new Date(waybill.preferred_date).toLocaleDateString()}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value"><strong>${waybill.status.toUpperCase().replace('-', ' ')}</strong></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">${waybill.description || 'N/A'}</span>
                </div>
            </div>
            
            <div class="signature-section">
                <h3>✍️ Signatures</h3>
                <p style="text-align: center; color: #666; margin-bottom: 10px; font-size: 11px;">
                    Please sign below to confirm receipt and delivery
                </p>
                
                <div class="signatures">
                    <div class="signature-box">
                        <h4>Sender Signature</h4>
                        <div class="signature-line"></div>
                        <div class="signature-label">${senderDisplayName}</div>
                    </div>
                    
                    <div class="signature-box">
                        <h4>Driver Signature</h4>
                        <div class="signature-line"></div>
                        <div class="signature-label">${waybill.driver || 'Driver Name'}</div>
                    </div>
                    
                    <div class="signature-box">
                        <h4>Recipient Signature</h4>
                        <div class="signature-line"></div>
                        <div class="signature-label">${recipientDisplayName}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="invoice-footer">
            <p><strong>Waybill Tracker</strong> - Professional Logistics Services | Generated: ${currentDate} ${currentTime}</p>
        </div>
    </div>
    
    <script>
        // Auto-print when page loads (optional)
        // window.onload = function() { window.print(); }
    </script>
</body>
</html>`;
}
// Routes

// SSE endpoint for real-time updates
app.get('/api/events', async (req, res) => {
    // Require token via query ?token=
    const token = req.query.token;
    if (!token) {
        return res.status(401).end();
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
        return res.status(401).end();
    }
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ event: 'connected', data: { message: 'Connected to real-time updates' } })}\n\n`);

    // Add this connection to our set
    addSSEConnection(res);

    // Send periodic heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        try {
            res.write(`data: ${JSON.stringify({ event: 'heartbeat', data: { timestamp: new Date().toISOString() } })}\n\n`);
        } catch (error) {
            clearInterval(heartbeat);
            sseConnections.delete(res);
        }
    }, 30000); // Send heartbeat every 30 seconds

    // Clean up heartbeat when connection closes
    res.on('close', () => {
        clearInterval(heartbeat);
    });
});

// Get all waybills
app.get('/api/waybills', requireAuth, async (req, res) => {
    try {
        const data = await readWaybills();
        const waybills = data.waybills
            .map(mapWaybillRowToClient)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ success: true, waybills });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve waybills'
        });
    }
});

// Get archived waybills
app.get('/api/waybills/archived', requireAuth, async (req, res) => {
    try {
        const data = await readArchivedWaybills();
        const waybills = data.waybills
            .map(mapWaybillRowToClient)
            .sort((a, b) => new Date(b.archivedAt || b.updatedAt) - new Date(a.archivedAt || a.updatedAt));
        res.json({ success: true, waybills });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve archived waybills'
        });
    }
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Get waybill by ID
app.get('/api/waybills/:id', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('waybills')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();
        if (error) throw error;
        const waybill = mapWaybillRowToClient(data);
        
        if (!waybill) {
            return res.status(404).json({
                success: false,
                error: 'Waybill not found'
            });
        }
        
        res.json({
            success: true,
            waybill
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve waybill'
        });
    }
});

// Search waybills
app.get('/api/waybills/search/:query', requireAuth, async (req, res) => {
    try {
        const q = req.params.query;
        const { data, error } = await supabaseAdmin
            .from('waybills')
            .select('*')
            .or(`id.ilike.%${q}%,sender.ilike.%${q}%,recipient.ilike.%${q}%,sender_address.ilike.%${q}%,recipient_address.ilike.%${q}%,driver.ilike.%${q}%,status.ilike.%${q}%,description.ilike.%${q}%`);
        if (error) throw error;
        const waybills = (data || []).map(mapWaybillRowToClient)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ success: true, waybills });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to search waybills'
        });
    }
});

// Create new waybill
app.post('/api/waybills', requireAuth, async (req, res) => {
    try {
        const { sender, recipient, senderAddress, recipientAddress, driver, status, preferredDate, description } = req.body;
        
        console.log('Received data:', { sender, recipient, senderAddress, recipientAddress, driver, status, preferredDate, description });
        
        // Validation
        if (!sender || !recipient || !senderAddress || !recipientAddress || !driver || !status || !preferredDate) {
            console.log('Missing fields:', {
                sender: !sender,
                recipient: !recipient,
                senderAddress: !senderAddress,
                recipientAddress: !recipientAddress,
                driver: !driver,
                status: !status,
                preferredDate: !preferredDate
            });
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        if (!['pending', 'in-transit', 'delivered'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }
        
        const newWaybill = {
            id: generateWaybillId(),
            sender: sender.trim(),
            recipient: recipient.trim(),
            sender_address: senderAddress.trim(),
            recipient_address: recipientAddress.trim(),
            driver: driver.trim(),
            status,
            preferred_date: preferredDate.trim(),
            description: description ? description.trim() : ''
        };

        const { data, error } = await supabaseAdmin
            .from('waybills')
            .insert([newWaybill])
            .select('*')
            .single();
        
        if (!error) {
            // Send email notification to recipient (in background, don't wait for response)
            if (isValidEmail(recipient.trim())) {
                sendWaybillCreationEmail(data)
                    .then(success => {
                        if (success) {
                            console.log(`✅ Email notification sent successfully for waybill ${data.id}`);
                        } else {
                            console.log(`⚠️ Failed to send email notification for waybill ${data.id}`);
                        }
                    })
                    .catch(emailError => {
                        console.error(`❌ Email sending error for waybill ${data.id}:`, emailError);
                    });
            } else {
                console.log(`⚠️ Recipient "${recipient}" is not a valid email address. Email notification skipped.`);
            }
            
            // Broadcast SSE event for new waybill
            broadcastSSE('waybill_created', mapWaybillRowToClient(data));
            
            res.status(201).json({
                success: true,
                message: 'Waybill created successfully',
                waybill: mapWaybillRowToClient(data)
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save waybill'
            });
        }
    } catch (error) {
        console.error('Error creating waybill:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Archive waybill - MODIFIED VERSION with admin check
app.post('/api/waybills/:id/archive', requireAuth, async (req, res) => {
    try {
        const { sharepointLink } = req.body || {};
        const currentUser = req.user; // From auth middleware
        
        const { data: waybill, error: fetchErr } = await supabaseAdmin
            .from('waybills')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!waybill) {
            return res.status(404).json({ success: false, error: 'Waybill not found' });
        }
        
        // Check if waybill is delivered before archiving
        if (waybill.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                error: 'Only delivered waybills can be archived'
            });
        }
        
        // NEW: Check if current user is the sender, recipient, or admin
        const isAdmin = currentUser.email === 'bashar.al-ali@drd-me.org';
        const isSender = currentUser.email === waybill.sender;
        const isRecipient = currentUser.email === waybill.recipient;
        
        if (!isAdmin && !isSender && !isRecipient) {
            return res.status(403).json({
                success: false,
                error: 'Only the sender, recipient, or admin can archive this waybill'
            });
        }
        
        // Validate SharePoint link is provided and appears valid
        if (!sharepointLink || typeof sharepointLink !== 'string' || !sharepointLink.trim()) {
            return res.status(400).json({
                success: false,
                error: 'SharePoint link is required to archive a delivered waybill'
            });
        }

        const link = sharepointLink.trim();
        // Basic SharePoint URL validation
        const sharepointRegex = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:sharepoint(?:-df)?\.com)\/[\S]*$/i;
        if (!sharepointRegex.test(link)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid SharePoint link. It must be a URL under sharepoint.com'
            });
        }
        
        const archivedRecord = {
            id: waybill.id,
            sender: waybill.sender,
            recipient: waybill.recipient,
            sender_address: waybill.sender_address || waybill.senderAddress,
            recipient_address: waybill.recipient_address || waybill.recipientAddress,
            driver: waybill.driver || null,
            status: waybill.status,
            preferred_date: waybill.preferred_date || waybill.preferredDate,
            description: waybill.description || '',
            sharepoint_link: link
        };

        const { error: insErr, data: archived } = await supabaseAdmin
            .from('archived_waybills')
            .insert([archivedRecord])
            .select('*')
            .single();

        if (!insErr) {
            await supabaseAdmin.from('waybills').delete().eq('id', waybill.id);
            // Broadcast SSE event for archived waybill
            broadcastSSE('waybill_archived', mapWaybillRowToClient(archived));
            
            res.json({
                success: true,
                message: 'Waybill archived successfully',
                waybill: mapWaybillRowToClient(archived)
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to archive waybill'
            });
        }
    } catch (error) {
        console.error('Error archiving waybill:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Restore archived waybill
app.post('/api/waybills/:id/restore', requireAuth, async (req, res) => {
    try {
        const { data: archived, error: fetchErr } = await supabaseAdmin
            .from('archived_waybills')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!archived) {
            return res.status(404).json({ success: false, error: 'Archived waybill not found' });
        }

        const restored = {
            id: archived.id,
            sender: archived.sender,
            recipient: archived.recipient,
            sender_address: archived.sender_address,
            recipient_address: archived.recipient_address,
            driver: archived.driver || '',
            status: archived.status,
            preferred_date: archived.preferred_date,
            description: archived.description || ''
        };

        const { error: insertErr, data: inserted } = await supabaseAdmin
            .from('waybills')
            .insert([restored])
            .select('*')
            .single();

        if (!insertErr) {
            await supabaseAdmin.from('archived_waybills').delete().eq('id', archived.id);
            // Broadcast SSE event for restored waybill
            broadcastSSE('waybill_restored', mapWaybillRowToClient(inserted));
            
            res.json({
                success: true,
                message: 'Waybill restored successfully',
                waybill: mapWaybillRowToClient(inserted)
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to restore waybill'
            });
        }
    } catch (error) {
        console.error('Error restoring waybill:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Update entire waybill
app.put('/api/waybills/:id', requireAuth, async (req, res) => {
    try {
        const { sender, recipient, senderAddress, recipientAddress, driver, status, preferredDate, description } = req.body;
        
        // Validation
        if (!sender || !recipient || !senderAddress || !recipientAddress || !driver || !status || !preferredDate) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        if (!['pending', 'in-transit', 'delivered'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }
        
        const updates = {
            sender: sender.trim(),
            recipient: recipient.trim(),
            sender_address: senderAddress.trim(),
            recipient_address: recipientAddress.trim(),
            driver: driver.trim(),
            status,
            preferred_date: preferredDate.trim(),
            description: description ? description.trim() : ''
        };

        const { data, error } = await supabaseAdmin
            .from('waybills')
            .update(updates)
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (!error) {
            // Broadcast SSE event for updated waybill
            broadcastSSE('waybill_updated', mapWaybillRowToClient(data));
            
            res.json({
                success: true,
                message: 'Waybill updated successfully',
                waybill: mapWaybillRowToClient(data)
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to update waybill'
            });
        }
    } catch (error) {
        console.error('Error updating waybill:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Update waybill status only - Enhanced version// Update waybill status only - Enhanced version with recipient validation
app.patch('/api/waybills/:id/status', requireAuth, async (req, res) => {
    try {
        const { status, location, notes } = req.body;
        const currentUser = req.user; // From auth middleware
        
        // Validation
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }
        
        if (!['pending', 'in-transit', 'delivered'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: pending, in-transit, delivered'
            });
        }
        
        // Get the current waybill
        const { data: current, error: fetchErr } = await supabaseAdmin
            .from('waybills')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!current) {
            return res.status(404).json({ success: false, error: 'Waybill not found' });
        }

        // Check if user is trying to change status to "delivered"
        if (status === 'delivered') {
            // Verify that the current user is the recipient
            if (currentUser.email !== current.recipient) {
                return res.status(403).json({
                    success: false,
                    error: 'Only the recipient can mark this waybill as delivered'
                });
            }
        }

        const previousStatus = current.status;

        const { data: updated, error: updErr } = await supabaseAdmin
            .from('waybills')
            .update({ status })
            .eq('id', req.params.id)
            .select('*')
            .single();
        if (updErr) throw updErr;

        // Add to tracking history
        const trackingEntry = {
            waybill_id: req.params.id,
            status,
            location: location || '',
            notes: notes || '',
            updated_by: currentUser.email // Track who made the change
        };
        await supabaseAdmin.from('tracking_history').insert([trackingEntry]);

        if (updated) {
            // If status was changed to "delivered" by recipient, send email to sender
            if (status === 'delivered' && previousStatus !== 'delivered') {
                sendDeliveryConfirmationEmail(updated)
                    .then(success => {
                        if (success) {
                            console.log(`✅ Delivery confirmation email sent to sender for waybill ${updated.id}`);
                        } else {
                            console.log(`⚠️ Failed to send delivery confirmation email for waybill ${updated.id}`);
                        }
                    })
                    .catch(emailError => {
                        console.error(`❌ Email sending error for waybill ${updated.id}:`, emailError);
                    });
            }
            
            // Broadcast SSE event for status update
            broadcastSSE('waybill_status_updated', mapWaybillRowToClient(updated));
            
            res.json({
                success: true,
                message: `Waybill status updated from ${previousStatus} to ${status}`,
                waybill: mapWaybillRowToClient(updated),
                updatedBy: currentUser.email
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to update waybill status'
            });
        }
    } catch (error) {
        console.error('Error updating waybill status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update waybill status'
        });
    }
});

// Get tracking history for a waybill
app.get('/api/waybills/:id/tracking', requireAuth, async (req, res) => {
    try {
        const { data: history, error } = await supabaseAdmin
            .from('tracking_history')
            .select('*')
            .eq('waybill_id', req.params.id)
            .order('timestamp', { ascending: false });
        if (error) throw error;
        res.json({
            success: true,
            trackingHistory: history || []
        });
    } catch (error) {
        console.error('Error retrieving tracking history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve tracking history'
        });
    }
});

// Delete waybill
// Delete waybill - UPDATED with admin check
app.delete('/api/waybills/:id', requireAuth, async (req, res) => {
    try {
        const currentUser = req.user; // From auth middleware
        
        // Check if current user is the admin
        if (currentUser.email !== 'bashar.al-ali@drd-me.org') {
            return res.status(403).json({
                success: false,
                error: 'Only admin (bashar.al-ali@drd-me.org) can delete waybills'
            });
        }
        
        const { data, error } = await supabaseAdmin
            .from('waybills')
            .delete()
            .eq('id', req.params.id)
            .select('*')
            .single();
        
        if (!error && data) {
            // Broadcast SSE event for deleted waybill
            broadcastSSE('waybill_deleted', mapWaybillRowToClient(data));
            
            res.json({
                success: true,
                message: 'Waybill deleted successfully',
                waybill: mapWaybillRowToClient(data)
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to delete waybill'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete waybill'
        });
    }
});

// Generate invoice for waybill
// Generate invoice for waybill (updated)
app.get('/api/waybills/:id/invoice', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('waybills')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();
        
        if (error) throw error;
        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Waybill not found'
            });
        }
        
        // Generate HTML invoice (now async)
        const invoiceHtml = await generateInvoiceHTML(data);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(invoiceHtml);
        
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate invoice'
        });
    }
});

// Export archived waybills to Excel
app.get('/api/export/archived', requireAuth, async (req, res) => {
    try {
        const data = await readArchivedWaybills();
        
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Archived Waybills');
        
        // Define columns
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 15 },
            { header: 'Sender', key: 'sender', width: 20 },
            { header: 'Recipient', key: 'recipient', width: 20 },
            { header: 'Driver', key: 'driver', width: 20 },
            { header: 'Sender Address', key: 'senderAddress', width: 30 },
            { header: 'Recipient Address', key: 'recipientAddress', width: 30 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Description', key: 'description', width: 25 },
            { header: 'Created At', key: 'createdAt', width: 20 },
            { header: 'Archived At', key: 'archivedAt', width: 20 }
        ];
        
        // Add data rows
        data.waybills.forEach(waybill => {
            worksheet.addRow({
                id: waybill.id,
                sender: waybill.sender,
                recipient: waybill.recipient,
                driver: waybill.driver || '',
                senderAddress: waybill.sender_address || waybill.senderAddress,
                recipientAddress: waybill.recipient_address || waybill.recipientAddress,
                status: waybill.status,
                description: waybill.description || '',
                createdAt: new Date(waybill.created_at || waybill.createdAt).toLocaleString(),
                archivedAt: waybill.archived_at ? new Date(waybill.archived_at).toLocaleString() : ''
            });
        });
        
        // Style the header row
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6CC' }
            };
        });
        
        // Set response headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=archived-waybills.xlsx');
        
        // Write to response
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export waybills'
        });
    }
});

// Get statistics
app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const { data: waybills, error } = await supabaseAdmin
            .from('waybills')
            .select('status');
        if (error) throw error;
        const stats = {
            total: waybills.length,
            pending: waybills.filter(w => w.status === 'pending').length,
            inTransit: waybills.filter(w => w.status === 'in-transit').length,
            delivered: waybills.filter(w => w.status === 'delivered').length
        };
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Initialize and start server
async function startServer() {
    try {
        await initializeDataFiles();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Waybill Tracker Server running on http://localhost:${PORT}`);
            console.log(`📁 Data file: ${DATA_FILE}`);
            console.log(`📁 Archive file: ${ARCHIVE_FILE}`);
            console.log(`🌐 Open http://localhost:${PORT} in your browser`);
            console.log(`📱 Mobile access: Use your computer's IP address instead of localhost`);
            console.log('\nAPI Endpoints:');
            console.log('  GET    /api/waybills           - Get all waybills');
            console.log('  GET    /api/waybills/archived  - Get archived waybills');
            console.log('  GET    /api/waybills/:id       - Get waybill by ID');
            console.log('  GET    /api/waybills/search/:query - Search waybills');
            console.log('  GET    /api/waybills/:id/invoice - Generate waybill invoice');
            console.log('  POST   /api/waybills           - Create new waybill');
            console.log('  POST   /api/waybills/:id/archive - Archive waybill (delivered only)');
            console.log('  POST   /api/waybills/:id/restore - Restore archived waybill');
            console.log('  PUT    /api/waybills/:id       - Update entire waybill');
            console.log('  PATCH  /api/waybills/:id/status - Update waybill status only');
            console.log('  GET    /api/waybills/:id/tracking - Get tracking history');
            console.log('  DELETE /api/waybills/:id       - Delete waybill');
            console.log('  GET    /api/export/archived    - Export archived waybills to Excel');
            console.log('  GET    /api/stats              - Get statistics');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();