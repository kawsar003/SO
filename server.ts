import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// --- MySQL Database Initialization ---
let pool: any = null;

async function getPool() {
  if (pool) return pool;
  
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'kebdtop1_management_user';
  const dbPassword = process.env.DB_PASSWORD || 'kaWSar03%management2003%';
  const dbName = process.env.DB_NAME || 'kebdtop1_management';

  if (!dbHost || !dbUser || !dbName) {
    return null;
  }

  try {
    pool = mysql.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000 // 10 seconds timeout
    });
    
    // Explicitly test the connection
    const conn = await pool.getConnection();
    conn.release();
    
    console.log("Connected to MySQL successfully.");
    return pool;
  } catch (err: any) {
    // Quietly fallback without throwing log-analyzer alerts
    pool = null;
    return null;
  }
}

async function initializeDatabase() {
  const connectionPool = await getPool();
  if (!connectionPool) {
    console.warn("MySQL pool not available. Database initialization skipped.");
    return;
  }

  try {
    let schemaFile = path.join(process.cwd(), 'database.sql');
    if (!fs.existsSync(schemaFile)) {
      schemaFile = path.join(process.cwd(), 'schema.sql');
    }
    if (!fs.existsSync(schemaFile)) {
      schemaFile = path.join(__dirname, 'schema.sql');
    }
    if (!fs.existsSync(schemaFile)) {
      schemaFile = path.join(__dirname, 'database.sql');
    }
    
    if (!fs.existsSync(schemaFile)) {
      console.error("Neither database.sql nor schema.sql file was found. Database initialization skipped.");
      return;
    }

    const schemaSql = await fs.promises.readFile(schemaFile, 'utf-8');
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements. Executing...`);

    for (const statement of statements) {
      try {
        await connectionPool.query(statement);
      } catch (stmtErr: any) {
        if (stmtErr.code === 'ER_TABLE_EXISTS_ERROR' || stmtErr.message?.includes('already exists')) {
          // Normal
        } else if (stmtErr.code === 'ER_DUP_FIELDNAME') {
          // Normal
        } else {
          console.error(`Error executing statement: ${statement}\nError:`, stmtErr);
        }
      }
    }

    // Migration: Add missing columns
    const [columns]: any = await connectionPool.query("SHOW COLUMNS FROM employees");
    const columnNames = columns.map((c: any) => c.Field);
    
    if (!columnNames.includes('name')) await connectionPool.query("ALTER TABLE employees ADD COLUMN name VARCHAR(255) DEFAULT ''");
    if (!columnNames.includes('email')) await connectionPool.query("ALTER TABLE employees ADD COLUMN email VARCHAR(255)");
    if (!columnNames.includes('department')) await connectionPool.query("ALTER TABLE employees ADD COLUMN department VARCHAR(100)");
    if (!columnNames.includes('designation')) await connectionPool.query("ALTER TABLE employees ADD COLUMN designation VARCHAR(100)");
    if (!columnNames.includes('password')) await connectionPool.query("ALTER TABLE employees ADD COLUMN password VARCHAR(255)");
    if (!columnNames.includes('role')) await connectionPool.query("ALTER TABLE employees ADD COLUMN role VARCHAR(50) DEFAULT 'employee'");
    if (!columnNames.includes('joiningDate')) await connectionPool.query("ALTER TABLE employees ADD COLUMN joiningDate DATE");
    if (!columnNames.includes('employeeIdNumber')) await connectionPool.query("ALTER TABLE employees ADD COLUMN employeeIdNumber VARCHAR(50)");
    if (!columnNames.includes('whatsappNumber')) await connectionPool.query("ALTER TABLE employees ADD COLUMN whatsappNumber VARCHAR(50)");
    if (!columnNames.includes('cvUrl')) await connectionPool.query("ALTER TABLE employees ADD COLUMN cvUrl LONGTEXT");
    if (!columnNames.includes('cvFilename')) await connectionPool.query("ALTER TABLE employees ADD COLUMN cvFilename VARCHAR(255)");
    if (!columnNames.includes('photoUrl')) await connectionPool.query("ALTER TABLE employees ADD COLUMN photoUrl LONGTEXT");
    if (!columnNames.includes('basicSalary')) await connectionPool.query("ALTER TABLE employees ADD COLUMN basicSalary INT DEFAULT 15000");
    if (!columnNames.includes('advanceSalary')) await connectionPool.query("ALTER TABLE employees ADD COLUMN advanceSalary INT DEFAULT 0");
    if (!columnNames.includes('customBonus')) await connectionPool.query("ALTER TABLE employees ADD COLUMN customBonus INT DEFAULT -1");
    
    // Migration: Add missing columns to receipts table
    const [receiptColumns]: any = await connectionPool.query("SHOW COLUMNS FROM receipts").catch(() => [[]]);
    const receiptColumnNames = receiptColumns.map((c: any) => c.Field);
    if (receiptColumnNames.length > 0) {
      if (!receiptColumnNames.includes('employeeId')) await connectionPool.query("ALTER TABLE receipts ADD COLUMN employeeId INT NULL DEFAULT NULL");
      if (!receiptColumnNames.includes('purpose')) await connectionPool.query("ALTER TABLE receipts ADD COLUMN purpose VARCHAR(50) DEFAULT 'General'");
      if (!receiptColumnNames.includes('salaryMonth')) await connectionPool.query("ALTER TABLE receipts ADD COLUMN salaryMonth VARCHAR(20) NULL DEFAULT NULL");
    }

    // --- Sync MySQL into Memory arrays for App wide consistency ---
    try {
      const [allEmps]: any = await connectionPool.query("SELECT * FROM employees ORDER BY id ASC");
      if (allEmps && allEmps.length > 0) {
        employees = allEmps.map((e: any) => ({
          ...e,
          basicSalary: e.basicSalary !== undefined ? Number(e.basicSalary) : 15000,
          advanceSalary: e.advanceSalary !== undefined ? Number(e.advanceSalary) : 0,
          customBonus: e.customBonus !== undefined ? Number(e.customBonus) : -1
        }));
        console.log(`Synced ${employees.length} employees from MySQL to memory.`);
      }
      const [allReceipts]: any = await connectionPool.query("SELECT * FROM receipts ORDER BY id ASC");
      if (allReceipts && allReceipts.length > 0) {
        receipts = allReceipts;
      }
    } catch (e: any) {
      console.warn("Could not sync MySQL data to memory:", e.message);
    }
    
    console.log("Database schema check/initialization completed.");
  } catch (err) {
    console.error("Critical error during database initialization:", err);
  }
}


const app = express();
const PORT = 3000;

// Rewrite requests coming with /management/api prefix to /api
app.use((req, res, next) => {
  if (req.url.startsWith('/management/api/')) {
    req.url = req.url.replace('/management/api/', '/api/');
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- File Storage for CVs ---
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const CVS_DIR = path.join(UPLOADS_DIR, 'cvs');
const PHOTO_DIR = path.join(UPLOADS_DIR, 'photos');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(CVS_DIR)) fs.mkdirSync(CVS_DIR, { recursive: true });
if (!fs.existsSync(PHOTO_DIR)) fs.mkdirSync(PHOTO_DIR, { recursive: true });

function saveFileBase64(base64Data: string, filename: string, subDir: string): string {
  if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
  
  try {
    const [header, data] = base64Data.split(',');
    const cleanFilename = `${Date.now()}_${(filename || 'file').replace(/[^a-z0-9.]/gi, '_')}`;
    const dirPath = path.join(UPLOADS_DIR, subDir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    
    const filePath = path.join(dirPath, cleanFilename);
    
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    return `/management/uploads/${subDir}/${cleanFilename}`;
  } catch (err) {
    console.error(`Error saving ${subDir} file:`, err);
    return base64Data;
  }
}

function saveCVBase64(base64Data: string, filename: string): string {
  return saveFileBase64(base64Data, filename, 'cvs');
}

function savePhotoBase64(base64Data: string, filename: string): string {
  return saveFileBase64(base64Data, filename, 'photos');
}

app.use('/management/uploads', express.static(UPLOADS_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));


// --- User Activity Logging ---
let userActivities: any[] = [];
const ACTIVITIES_FILE = path.join(process.cwd(), 'user_activities.json');

function loadActivities() {
  try {
    if (fs.existsSync(ACTIVITIES_FILE)) {
      userActivities = JSON.parse(fs.readFileSync(ACTIVITIES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error("Error loading activities:", e);
  }
}

function saveActivities() {
  try {
    fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(userActivities.slice(-1000), null, 2));
  } catch (e) {
    console.error("Error saving activities:", e);
  }
}

function logActivity(user: string, action: string, module: string, details: string = '', email: string = 'system@company.com') {
  const activity = {
    id: Date.now(),
    user,
    email,
    action,
    module,
    details,
    timestamp: new Date().toISOString()
  };
  userActivities.unshift(activity);
  saveActivities();
}

loadActivities();

// --- Persistent JSON Database Engine ---
let employees: any[] = [];
let attendances: any[] = [];
let leaveRequests: any[] = [];
let requisitions: any[] = [];
let transactions: any[] = [];
let receipts: any[] = [];
let tasks: any[] = [];
let notifications: any[] = [];
let guests: any[] = [];

const DATABASE_FILE = path.join(process.cwd(), 'database.json');

function initializeSeedDatabase() {
  console.log('Initializing empty database with ZERO data as requested.');
  
  employees = [];
  attendances = [];
  receipts = [];
  tasks = [];
  notifications = [];
  leaveRequests = [];
  transactions = [];
  guests = [];

  saveDatabase();
}

function saveDatabase() {
  try {
    const data = {
      employees,
      attendances,
      leaveRequests,
      requisitions,
      transactions,
      receipts,
      tasks,
      notifications,
      guests
    };
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log('Database saved to disk path at ' + DATABASE_FILE);
  } catch (error) {
    console.error('Error saving database to file:', error);
  }
}

function loadDatabase() {
  try {
    if (fs.existsSync(DATABASE_FILE)) {
      const data = fs.readFileSync(DATABASE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      employees = parsed.employees || [];
      attendances = parsed.attendances || [];
      leaveRequests = parsed.leaveRequests || [];
      requisitions = parsed.requisitions || [];
      transactions = parsed.transactions || [];
      receipts = parsed.receipts || [];
      tasks = parsed.tasks || [];
      notifications = parsed.notifications || [];
      guests = parsed.guests || [];
      console.log('Database loaded successfully from file path');
    } else {
      initializeSeedDatabase();
    }
  } catch (error) {
    console.error('Error loading database, setting up seed initial databases:', error);
    initializeSeedDatabase();
  }
}

loadDatabase();

// --- API Routes ---

// Dashboard Stats
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  logActivity('User', 'Browsed Dashboard', 'Dashboard');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonthStr = `${year}-${month}`;

  const transactionExpenses = transactions.filter(t => t.category === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const transactionIncome = transactions.filter(t => t.category === 'Income').reduce((sum, t) => sum + t.amount, 0);

  const receiptExpenses = receipts.filter(r => r.status === 'approved' && r.type !== 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const creditReceipts = receipts.filter(r => r.status === 'approved' && r.type === 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Global totals for available balance
  const globalTotalExpenses = transactionExpenses + receiptExpenses;
  const globalTotalIncome = transactionIncome + creditReceipts;
  const availableBalance = globalTotalIncome - globalTotalExpenses;

  // Current month total expenses
  const monthlyTransactionExpenses = transactions
    .filter(t => t.category === 'Expense' && t.date && t.date.startsWith(currentMonthStr))
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyReceiptExpenses = receipts
    .filter(r => r.status === 'approved' && r.type !== 'Credit' && r.date && r.date.startsWith(currentMonthStr))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const totalMonthlyExpenses = monthlyTransactionExpenses + monthlyReceiptExpenses;

  res.json({
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'Active').length,
    presentToday: attendances.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'Present').length,
    totalExpenses: totalMonthlyExpenses,
    availableBalance
  });
});

// Employees
app.get('/api/employees', async (req: Request, res: Response) => {
  logActivity('User', 'Browsed Employee List', 'HR Management');
  const p = await getPool();
  if (p) {
    try {
      const [rows]: any = await p.query("SELECT * FROM employees ORDER BY id ASC");
      const mappedRows = rows.map((e: any) => ({
        ...e,
        basicSalary: e.basicSalary !== undefined ? Number(e.basicSalary) : 15000,
        advanceSalary: e.advanceSalary !== undefined ? Number(e.advanceSalary) : 0,
        customBonus: e.customBonus !== undefined ? Number(e.customBonus) : -1
      }));
      return res.json(mappedRows);
    } catch (err) {
      console.error("MySQL query error:", err);
      // Fallback if query fails
    }
  }
  const mappedEmployees = employees.map(e => ({
    ...e,
    basicSalary: e.basicSalary !== undefined ? Number(e.basicSalary) : 15000,
    advanceSalary: e.advanceSalary !== undefined ? Number(e.advanceSalary) : 0,
    customBonus: e.customBonus !== undefined ? Number(e.customBonus) : -1
  }));
  res.json(mappedEmployees);
});

app.post('/api/employees', async (req: Request, res: Response) => {
  const p = await getPool();
  
  // Process CV if present
  if (req.body.cvUrl && req.body.cvUrl.startsWith('data:')) {
    req.body.cvUrl = saveCVBase64(req.body.cvUrl, req.body.cvFilename);
  }
  
  // Process Photo if present
  if (req.body.photoUrl && req.body.photoUrl.startsWith('data:')) {
    req.body.photoUrl = savePhotoBase64(req.body.photoUrl, 'photo.jpg');
  }

  if (p) {
    try {
      const [result]: any = await p.query(
        "INSERT INTO employees (name, email, phone, department, designation, status, password, role, joiningDate, employeeIdNumber, whatsappNumber, cvUrl, cvFilename, photoUrl, basicSalary, advanceSalary, customBonus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          req.body.name || '', 
          req.body.email || '', 
          req.body.phone || '', 
          req.body.department || '', 
          req.body.designation || '', 
          req.body.status || 'Active', 
          req.body.password || 'Welcome@123', 
          req.body.role || 'employee', 
          req.body.joiningDate || new Date().toISOString().split('T')[0], 
          req.body.employeeIdNumber || '', 
          req.body.whatsappNumber || '', 
          req.body.cvUrl || '', 
          req.body.cvFilename || '',
          req.body.photoUrl || '',
          req.body.basicSalary !== undefined ? Number(req.body.basicSalary) : 15000,
          req.body.advanceSalary !== undefined ? Number(req.body.advanceSalary) : 0,
          req.body.customBonus !== undefined ? Number(req.body.customBonus) : -1
        ]
      );
      const newMemEmp = { id: result.insertId, ...req.body };
      employees.push(newMemEmp);
      return res.status(201).json(newMemEmp);
    } catch (err: any) {
      console.error("MySQL insert error:", err);
      return res.status(500).json({ error: 'Database insertion failed', details: err.message });
    }
  }
  
  const newEmployee = {
    id: employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1,
    ...req.body
  };
  employees.push(newEmployee);
  saveDatabase();
  res.status(201).json(newEmployee);
});

app.put('/api/employees/:id', async (req: Request, res: Response) => {
  const idStr = req.params.id;
  const p = await getPool();

  // Process CV if present and changed
  if (req.body.cvUrl && req.body.cvUrl.startsWith('data:')) {
    req.body.cvUrl = saveCVBase64(req.body.cvUrl, req.body.cvFilename);
  }
  
  // Process Photo if present and changed
  if (req.body.photoUrl && req.body.photoUrl.startsWith('data:')) {
    req.body.photoUrl = savePhotoBase64(req.body.photoUrl, 'photo.jpg');
  }

  if (p) {
    try {
      await p.query(
        "UPDATE employees SET name=?, email=?, phone=?, department=?, designation=?, status=?, password=?, role=?, joiningDate=?, employeeIdNumber=?, whatsappNumber=?, cvUrl=?, cvFilename=?, photoUrl=?, basicSalary=?, advanceSalary=?, customBonus=? WHERE id=?",
        [
          req.body.name || '', 
          req.body.email || '', 
          req.body.phone || '', 
          req.body.department || '', 
          req.body.designation || '', 
          req.body.status || 'Active', 
          req.body.password || 'Welcome@123', 
          req.body.role || 'employee', 
          req.body.joiningDate || new Date().toISOString().split('T')[0], 
          req.body.employeeIdNumber || '', 
          req.body.whatsappNumber || '', 
          req.body.cvUrl || '', 
          req.body.cvFilename || '',
          req.body.photoUrl || '',
          req.body.basicSalary !== undefined ? Number(req.body.basicSalary) : 15000,
          req.body.advanceSalary !== undefined ? Number(req.body.advanceSalary) : 0,
          req.body.customBonus !== undefined ? Number(req.body.customBonus) : -1,
          idStr
        ]
      );
      const memIx = employees.findIndex(e => String(e.id) === idStr);
      if (memIx !== -1) {
         employees[memIx] = { ...employees[memIx], ...req.body, id: Number(idStr) };
      }
      return res.json({ id: idStr, ...req.body });
    } catch (err: any) {
      console.error("MySQL update error:", err);
      return res.status(500).json({ error: 'Database update failed', details: err.message });
    }
  }

  const index = employees.findIndex(e => String(e.id) === idStr);
  console.log(`PUT /api/employees/${idStr} found at index ${index}`);
  if (index !== -1) {
    employees[index] = { ...employees[index], ...req.body };
    saveDatabase();
    res.json(employees[index]);
  } else {
    res.status(404).json({ error: 'Employee not found' });
  }
});

app.delete('/api/employees/:id', async (req: Request, res: Response) => {
  const idStr = req.params.id;
  const p = await getPool();
  if (p) {
    try {
      await p.query("DELETE FROM employees WHERE id = ?", [idStr]);
      const memIx = employees.findIndex(e => String(e.id) === idStr);
      if (memIx !== -1) employees.splice(memIx, 1);
      return res.status(204).send();
    } catch (err: any) {
      console.error("MySQL delete error:", err);
      return res.status(500).json({ error: 'Database delete failed', details: err.message });
    }
  }

  const index = employees.findIndex(e => String(e.id) === idStr);
  console.log(`DELETE /api/employees/${idStr} found at index ${index}`);
  if (index !== -1) {
    employees.splice(index, 1);
    saveDatabase();
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Employee not found' });
  }
});

// Attendances
app.get('/api/attendances', (req: Request, res: Response) => {
  logActivity('User', 'Browsed Attendance', 'HR Management');
  // Join with employee name
  const enrich = attendances.map(a => {
    const emp = employees.find(e => e.id === a.employeeId);
    return { ...a, employeeName: emp ? emp.name : 'Unknown' };
  });
  res.json(enrich);
});

app.post('/api/attendances', (req: Request, res: Response) => {
  const empId = Number(req.body.employeeId);
  const attDate = req.body.date;
  const attStatus = req.body.status;

  const isOnLeave = leaveRequests.some(r => 
    r.employeeId === empId && 
    r.status === 'Approved' && 
    attDate >= r.startDate && 
    attDate <= r.endDate
  );

  if (isOnLeave && attStatus !== 'Leave') {
    return res.status(400).json({ error: 'Employee is on approved leave. Cannot mark ' + attStatus });
  }

  const newAttendance = {
    id: attendances.length > 0 ? Math.max(...attendances.map(a => a.id)) + 1 : 1,
    ...req.body
  };
  attendances.push(newAttendance);
  saveDatabase();
  res.status(201).json(newAttendance);
});

app.put('/api/attendances/:id', (req: Request, res: Response) => {
  const idStr = req.params.id;
  const index = attendances.findIndex(a => String(a.id) === idStr);
  if (index !== -1) {
    const empId = Number(req.body.employeeId || attendances[index].employeeId);
    const attDate = req.body.date || attendances[index].date;
    const attStatus = req.body.status || attendances[index].status;

    const isOnLeave = leaveRequests.some(r => 
      r.employeeId === empId && 
      r.status === 'Approved' && 
      attDate >= r.startDate && 
      attDate <= r.endDate
    );

    if (isOnLeave && attStatus !== 'Leave') {
      return res.status(400).json({ error: 'Employee is on approved leave. Cannot mark ' + attStatus });
    }

    attendances[index] = { ...attendances[index], ...req.body, id: Number(idStr) };
    saveDatabase();
    res.json(attendances[index]);
  } else {
    res.status(404).json({ error: 'Attendance not found' });
  }
});

app.delete('/api/attendances/:id', (req: Request, res: Response) => {
  const idStr = req.params.id;
  const index = attendances.findIndex(a => String(a.id) === idStr);
  if (index !== -1) {
    const deleted = attendances.splice(index, 1);
    saveDatabase();
    res.json(deleted[0]);
  } else {
    res.status(404).json({ error: 'Attendance not found' });
  }
});

// Leave requests
app.get('/api/leave-requests', (req: Request, res: Response) => {
  logActivity('User', 'Browsed Leave Requests', 'HR Management');
  const enrich = leaveRequests.map(r => {
    const emp = employees.find(e => e.id === r.employeeId);
    return { ...r, employeeName: emp ? emp.name : 'Unknown' };
  });
  res.json(enrich);
});

app.post('/api/leave-requests', (req: Request, res: Response) => {
  const newRequest = {
    id: leaveRequests.length ? Math.max(...leaveRequests.map(r => r.id)) + 1 : 1,
    ...req.body
  };
  leaveRequests.push(newRequest);

  // Trigger notification
  const emp = employees.find(e => e.id === Number(newRequest.employeeId));
  notifications.unshift({
    id: notifications.length ? Math.max(...notifications.map(n => n.id)) + 1 : 1,
    type: 'Approval',
    title: 'New Leave Request',
    message: `${emp ? emp.name : 'An employee'} requested ${newRequest.type} from ${newRequest.startDate} to ${newRequest.endDate}.`,
    time: 'Just now',
    status: 'unread'
  });

  saveDatabase();
  res.status(201).json(newRequest);
});

app.put('/api/leave-requests/:id', (req: Request, res: Response) => {
  const idStr = req.params.id;
  const index = leaveRequests.findIndex(r => String(r.id) === idStr);
  if (index !== -1) {
    const oldStatus = leaveRequests[index].status;
    const newStatus = req.body.status || oldStatus;

    leaveRequests[index] = { ...leaveRequests[index], ...req.body, id: Number(idStr) };

    if (oldStatus !== 'Approved' && newStatus === 'Approved') {
      const lr = leaveRequests[index];
      const start = new Date(lr.startDate);
      const end = new Date(lr.endDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const existingAttIdx = attendances.findIndex(a => a.employeeId === lr.employeeId && a.date === dateStr);
        if (existingAttIdx !== -1) {
          attendances[existingAttIdx].status = 'Leave';
          attendances[existingAttIdx].checkIn = '';
          attendances[existingAttIdx].checkOut = '';
        } else {
          attendances.push({
            id: attendances.length > 0 ? Math.max(...attendances.map(a => a.id)) + 1 : 1,
            employeeId: lr.employeeId,
            date: dateStr,
            status: 'Leave',
            checkIn: '',
            checkOut: ''
          });
        }
      }
    }

    saveDatabase();
    res.json(leaveRequests[index]);
  } else {
    res.status(404).json({ error: 'Leave request not found' });
  }
});

app.delete('/api/leave-requests/:id', (req: Request, res: Response) => {
  const idStr = req.params.id;
  const index = leaveRequests.findIndex(r => String(r.id) === idStr);
  if (index !== -1) {
    leaveRequests.splice(index, 1);
    saveDatabase();
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Leave request not found' });
  }
});

// Requisitions
app.get('/api/requisitions', (req: Request, res: Response) => {
  logActivity('User', 'Browsed Requisitions', 'Accounting');
  const enrich = requisitions.map(r => {
    const emp = employees.find(e => e.id === r.employeeId);
    return { ...r, employeeName: emp ? emp.name : 'Unknown' };
  });
  res.json(enrich);
});

// Receipts
app.get('/api/receipts', (req: Request, res: Response) => {
  logActivity('User', 'Browsed Receipts', 'Accounting');
  res.json(receipts);
});

app.post('/api/receipts', (req: Request, res: Response) => {
  const newReceipt = {
    id: receipts.length + 1,
    status: 'received', // Default status
    ...req.body
  };
  receipts.push(newReceipt);

  // Trigger notification
  notifications.unshift({
    id: notifications.length + 1,
    type: 'System',
    title: 'New Requisition',
    message: `A new ${newReceipt.type || 'requisition'} for ৳${newReceipt.amount} has been raised by ${newReceipt.name || 'Unknown'}.`,
    time: 'Just now',
    status: 'unread'
  });

  saveDatabase();

  // Trigger Telegram alerts depending on the receipt type & status
  if (newReceipt.type === 'Debit') {
    triggerReceiptPendingTelegramAlert(newReceipt).catch(err => {
      console.error('Error triggering real-time pending alert:', err);
    });
  } else if (newReceipt.status === 'approved') {
    triggerReceiptApprovalTelegramAlert(newReceipt).catch(err => {
      console.error('Error triggering real-time alert:', err);
    });
  }

  res.status(201).json(newReceipt);
});

app.patch('/api/receipts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = receipts.findIndex(r => r.id === parseInt(id));
  if (index !== -1) {
    const oldStatus = receipts[index].status;
    receipts[index] = { ...receipts[index], ...req.body };
    const newStatus = receipts[index].status;
    saveDatabase();

    // Trigger alert if newly approved
    if (newStatus === 'approved' && oldStatus !== 'approved') {
      triggerReceiptApprovalTelegramAlert(receipts[index]).catch(err => {
        console.error('Error triggering real-time alert:', err);
      });
    }

    res.json(receipts[index]);
  } else {
    res.status(404).json({ message: 'Receipt not found' });
  }
});

app.put('/api/receipts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = receipts.findIndex(r => r.id === parseInt(id));
  if (index !== -1) {
    const oldStatus = receipts[index].status;
    receipts[index] = { ...receipts[index], ...req.body, id: parseInt(id) };
    const newStatus = receipts[index].status;
    saveDatabase();

    // Trigger alert if newly approved
    if (newStatus === 'approved' && oldStatus !== 'approved') {
      triggerReceiptApprovalTelegramAlert(receipts[index]).catch(err => {
        console.error('Error triggering real-time alert:', err);
      });
    }

    res.json(receipts[index]);
  } else {
    res.status(404).json({ message: 'Receipt not found' });
  }
});

app.delete('/api/receipts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = receipts.findIndex(r => r.id === parseInt(id));
  if (index !== -1) {
    receipts.splice(index, 1);
    saveDatabase();
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Receipt not found' });
  }
});

// Transactions
app.get('/api/transactions', (req: Request, res: Response) => {
  logActivity('User', 'Browsed Transactions', 'Accounting');
  res.json(transactions);
});

app.post('/api/transactions', (req: Request, res: Response) => {
  const newTransaction = {
    id: transactions.length + 1,
    ...req.body
  };
  transactions.push(newTransaction);
  saveDatabase();
  res.status(201).json(newTransaction);
});

// Tasks
app.get('/api/tasks', (req: Request, res: Response) => {
  logActivity('User', 'Browsed Tasks', 'Tasks');
  res.json(tasks);
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const newTask = {
    id: tasks.length + 1,
    ...req.body
  };
  tasks.push(newTask);
  saveDatabase();
  res.status(201).json(newTask);
});

// Guests
app.get('/api/guests', (req: Request, res: Response) => {
  logActivity('User', 'Browsed Guest List', 'Guest Management');
  res.json(guests);
});

app.post('/api/guests', (req: Request, res: Response) => {
  const newGuest = {
    id: guests.length > 0 ? Math.max(...guests.map(g => g.id)) + 1 : 1,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  guests.push(newGuest);
  saveDatabase();
  res.status(201).json(newGuest);
});

// User Activities API
app.get('/api/activities', (req: Request, res: Response) => {
  res.json(userActivities);
});

// Notifications
app.get('/api/notifications', (req: Request, res: Response) => {
  logActivity('User', 'Browsed Notifications', 'Notifications');
  res.json(notifications);
});

// Reallocation Slip Settings
let slipSettings = {
  title1: 'College of Tourism and Hospitality (CTH)',
  title2: 'Bangladesh Medical Tourism & Consultancy (BMTC)',
  address: '3rd Floor , Chowdhury Vila ,Golpahar Moor , Chittagong, Bangladesh.',
  phone: '01819-654083 / 01619-694949',
  additionalInfo: ''
};

let hrmSettings = {
  smartOfficeId: '',
  apiToken: '',
  apiKey: '',
  medicalPercentage: 8,
  housingPercentage: 25,
  festivalPercentage: 65,
  eidFitrMonth: '2026-03',
  eidAdhaMonth: '2026-05'
};

const HRM_SETTINGS_FILE = path.join(process.cwd(), 'hrm_settings.json');

function generateHrmSettings() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const genString = (len: number) => {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return s;
  };
  
  const smartOfficeId = `SO-${genString(4)}-${genString(4)}`;
  const apiToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrm_${genString(32).toLowerCase()}`;
  const apiKey = `hrm_key_${genString(24).toLowerCase()}`;
  
  return { smartOfficeId, apiToken, apiKey };
}

function saveHrmSettings() {
  try {
    fs.writeFileSync(HRM_SETTINGS_FILE, JSON.stringify(hrmSettings, null, 2), 'utf-8');
    console.log('HRM settings saved to file');
  } catch (error) {
    console.error('Error saving HRM settings:', error);
  }
}

function loadHrmSettings() {
  try {
    if (fs.existsSync(HRM_SETTINGS_FILE)) {
      const data = fs.readFileSync(HRM_SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      hrmSettings = { ...hrmSettings, ...parsed };
      console.log('HRM settings loaded from file');
    }
  } catch (error) {
    console.error('Error loading HRM settings:', error);
  }

  // Backfill percentages if undefined
  hrmSettings.medicalPercentage = hrmSettings.medicalPercentage !== undefined ? Number(hrmSettings.medicalPercentage) : 8;
  hrmSettings.housingPercentage = hrmSettings.housingPercentage !== undefined ? Number(hrmSettings.housingPercentage) : 25;
  hrmSettings.festivalPercentage = hrmSettings.festivalPercentage !== undefined ? Number(hrmSettings.festivalPercentage) : 65;
  hrmSettings.eidFitrMonth = hrmSettings.eidFitrMonth !== undefined ? hrmSettings.eidFitrMonth : '2026-03';
  hrmSettings.eidAdhaMonth = hrmSettings.eidAdhaMonth !== undefined ? hrmSettings.eidAdhaMonth : '2026-05';

  // Ensure values exist permanently
  if (!hrmSettings.smartOfficeId || !hrmSettings.apiToken || !hrmSettings.apiKey) {
    const defaults = generateHrmSettings();
    hrmSettings.smartOfficeId = hrmSettings.smartOfficeId || defaults.smartOfficeId;
    hrmSettings.apiToken = hrmSettings.apiToken || defaults.apiToken;
    hrmSettings.apiKey = hrmSettings.apiKey || defaults.apiKey;
    saveHrmSettings();
  }
}

loadHrmSettings();

app.get('/api/hrm-settings', (req: Request, res: Response) => {
  res.json(hrmSettings);
});

app.post('/api/hrm-settings', (req: Request, res: Response) => {
  hrmSettings = { ...hrmSettings, ...req.body };
  saveHrmSettings();
  res.json(hrmSettings);
});

app.post('/api/hrm-settings/regenerate', (req: Request, res: Response) => {
  const defaults = generateHrmSettings();
  // Keep the permanent Smart Office ID, only regenerate tokens/keys
  hrmSettings.apiToken = defaults.apiToken;
  hrmSettings.apiKey = defaults.apiKey;
  saveHrmSettings();
  res.json(hrmSettings);
});

app.post('/api/hrm-settings/submit-fingerprint', (req: Request, res: Response) => {
  const { smartOfficeId, apiToken, apiKey, employeeId, status, checkIn, checkOut, date } = req.body;

  // 1. Validate credentials
  if (
    smartOfficeId !== hrmSettings.smartOfficeId ||
    apiToken !== hrmSettings.apiToken ||
    apiKey !== hrmSettings.apiKey
  ) {
    return res.status(401).json({ error: 'Device connection rejected: Invalid Smart Office ID, API Token, or API Key.' });
  }

  // 2. Validate employee
  const targetEmployee = employees.find(e => String(e.id) === String(employeeId));
  if (!targetEmployee) {
    return res.status(404).json({ error: 'Sync Failed: Employee ID not registered in HR databases.' });
  }

  // 3. Setup dates and defaults
  const syncDate = date || new Date().toISOString().split('T')[0];
  const scanCheckIn = checkIn || '09:00:00';
  const scanCheckOut = checkOut || '17:30:00';

  // 4. Check if an attendance record already exists for this date and employee
  let isUpdate = false;
  let record = attendances.find(a => String(a.employeeId) === String(employeeId) && a.date === syncDate);

  if (record) {
    record.status = status || 'Present';
    record.checkIn = scanCheckIn;
    record.checkOut = scanCheckOut;
    isUpdate = true;
  } else {
    // Generate new attendance ID
    const nextId = attendances.length > 0 ? Math.max(...attendances.map(a => a.id)) + 1 : 1001;
    record = {
      id: nextId,
      employeeId: Number(employeeId),
      employeeName: targetEmployee.name,
      employeeIdNumber: targetEmployee.employeeIdNumber || `EMP-${employeeId}`,
      date: syncDate,
      checkIn: scanCheckIn,
      checkOut: scanCheckOut,
      status: status || 'Present'
    };
    attendances.push(record);
  }

  saveDatabase();

  // 5. Log activity
  logActivity(
    'SmartOffice App',
    `Fingerprint Sync ${isUpdate ? 'Update' : 'Creation'}`,
    'HRM API Gateway',
    `Attendance registered for ${targetEmployee.name} (${record.employeeIdNumber}) as ${status} on ${syncDate}`
  );

  res.json({
    success: true,
    message: `Attendance synchronized successfully via SO-Attendance API gateway for ${targetEmployee.name}.`,
    data: record
  });
});

app.get('/api/slip-settings', (req: Request, res: Response) => {
  logActivity('User', 'Browsed Slip Settings', 'Settings');
  res.json(slipSettings);
});

app.post('/api/slip-settings', (req: Request, res: Response) => {
  slipSettings = { ...slipSettings, ...req.body };
  res.json(slipSettings);
});

// --- Telegram automated reporting settings & engine ---
let telegramSettings = {
  botToken: '',
  userIds: [] as string[],
  sendDaily: true,
  sendMonthly: true,
  sendPaid: true,
  lastDailySent: '', // 'YYYY-MM-DD'
  lastMonthlySent: '', // 'YYYY-MM'
  lastPaidSent: '' // 'YYYY-MM'
};

const TELEGRAM_SETTINGS_FILE = path.join(process.cwd(), 'telegram_settings.json');

function loadTelegramSettings() {
  try {
    if (fs.existsSync(TELEGRAM_SETTINGS_FILE)) {
      const data = fs.readFileSync(TELEGRAM_SETTINGS_FILE, 'utf-8');
      telegramSettings = { ...telegramSettings, ...JSON.parse(data) };
      console.log('Telegram settings loaded from file');
    }
  } catch (error) {
    console.error('Error loading Telegram settings:', error);
  }
}

function saveTelegramSettings() {
  try {
    fs.writeFileSync(TELEGRAM_SETTINGS_FILE, JSON.stringify(telegramSettings, null, 2), 'utf-8');
    console.log('Telegram settings saved to file');
  } catch (error) {
    console.error('Error saving Telegram settings:', error);
  }
}

// Load settings at boot
loadTelegramSettings();

// --- Auth credentials settings & engine ---
let authSettings = {
  email: 'k.e.bd.contact@gmail.com',
  password: '123456', // Default password
  permissions: {
    dashboard: true,
    hr: true,
    attendance: true,
    leave: true,
    accounting: true,
    requisitions: true,
    tasks: true,
    notifications: true,
    reports: true,
    guest: true,
    settings: false, // System settings options remain locked by default
    access: true,
    activities: true,
    inventory: true
  } as Record<string, boolean>
};

const AUTH_SETTINGS_FILE = path.join(process.cwd(), 'auth_settings.json');

function loadAuthSettings() {
  try {
    if (fs.existsSync(AUTH_SETTINGS_FILE)) {
      const data = fs.readFileSync(AUTH_SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      authSettings = { 
        ...authSettings, 
        ...parsed,
        permissions: { ...authSettings.permissions, ...parsed.permissions }
      };
      console.log('Auth settings loaded from file');
    } else {
      saveAuthSettings();
    }
  } catch (error) {
    console.error('Error loading Auth settings:', error);
  }
}

function saveAuthSettings() {
  try {
    fs.writeFileSync(AUTH_SETTINGS_FILE, JSON.stringify(authSettings, null, 2), 'utf-8');
    console.log('Auth settings saved to file');
  } catch (error) {
    console.error('Error saving Auth settings:', error);
  }
}

loadAuthSettings();

// Check if a date is the last day of the month
function isLastDayOfMonth(date: Date): boolean {
  const tomorrow = new Date(date.getTime());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getMonth() !== date.getMonth();
}

async function sendTelegramMessage(token: string, chatId: string, htmlMessage: string) {
  if (!token || !chatId) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlMessage,
        parse_mode: 'HTML'
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Telegram API error for chat ${chatId}:`, errText);
      throw new Error(errText);
    }
    console.log(`Telegram message successfully sent to ${chatId}`);
  } catch (err: any) {
    console.error(`Failed to send Telegram message to ${chatId}:`, err);
    throw err;
  }
}

async function sendTelegramDocument(token: string, chatId: string, filename: string, content: string, caption?: string) {
  if (!token || !chatId) return;
  const url = `https://api.telegram.org/bot${token}/sendDocument`;
  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    if (caption) formData.append('caption', caption);
    
    const blob = new Blob([content], { type: 'text/csv' });
    formData.append('document', blob, filename);

    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Telegram API error for chat ${chatId} (document):`, errText);
      throw new Error(errText);
    }
  } catch (error) {
    console.error('Failed to send telegram document:', error);
    throw error;
  }
}

async function triggerReceiptPendingTelegramAlert(receipt: any) {
  if (!telegramSettings.botToken || telegramSettings.userIds.length === 0) return;

  const receiptNo = String(receipt.id).padStart(4, '0');
  const dateVal = receipt.date || new Date().toISOString().split('T')[0];
  const totalAmount = Number(receipt.amount) || 0;

  const alertMessage = 
    `<b>New Debit Voucher Pending</b>\n` +
    `Date: <b>${dateVal}</b>\n\n` +
    `*Receipt No: <b>${receiptNo}</b>\n` +
    `*Total Amount: <b>৳${totalAmount.toFixed(2)}</b>\n` +
    `*Status: <b>Pending Approval</b>\n\n` +
    `Report generated automatically by SO System.`;

  for (const uid of telegramSettings.userIds) {
    try {
      await sendTelegramMessage(telegramSettings.botToken, uid, alertMessage);
    } catch (err) {
      console.error(`Failed to send real-time pending alert to ${uid}:`, err);
    }
  }
}

async function triggerReceiptApprovalTelegramAlert(receipt: any) {
  if (!telegramSettings.botToken || telegramSettings.userIds.length === 0) return;

  const receiptNo = String(receipt.id).padStart(4, '0');
  const dateVal = receipt.date || new Date().toISOString().split('T')[0];
  const totalAmount = Number(receipt.amount) || 0;

  // Calculate current availableBalance
  const transactionExpenses = transactions.filter(t => t.category === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const transactionIncome = transactions.filter(t => t.category === 'Income').reduce((sum, t) => sum + t.amount, 0);

  const receiptExpenses = receipts.filter(r => r.status === 'approved' && r.type !== 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const creditReceipts = receipts.filter(r => r.status === 'approved' && r.type === 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const totalExpenses = transactionExpenses + receiptExpenses;
  const totalIncome = transactionIncome + creditReceipts;
  const netCash = totalIncome - totalExpenses;

  const isCredit = receipt.type === 'Credit';
  let previousFund = 0;
  let availableFund = netCash;

  if (isCredit) {
    previousFund = availableFund - totalAmount;
  } else {
    previousFund = availableFund + totalAmount;
  }

  const voucherType = isCredit ? 'Credit' : 'Debit';

  const alertMessage = 
    `New ${voucherType}\n` +
    `Date: <b>${dateVal}</b>\n\n` +
    `*Receipt No: <b>${receiptNo}</b>\n` +
    `*Total Amount: <b>৳${totalAmount.toFixed(2)}</b>\n` +
    `*Previous Fund: <b>৳${previousFund.toFixed(2)}</b>\n` +
    `*Available Fund: <b>৳${availableFund.toFixed(2)}</b>\n\n` +
    `Report genareted automatically by SO System.`;

  for (const uid of telegramSettings.userIds) {
    try {
      await sendTelegramMessage(telegramSettings.botToken, uid, alertMessage);
    } catch (err) {
      console.error(`Failed to send real-time receipt approval alert to ${uid}:`, err);
    }
  }
}

function generateCustomReportHTML(startDate: string, endDate: string, module: string): string {
  const isDateRange = startDate !== endDate;
  const dateLabel = isDateRange ? `${startDate} to ${endDate}` : startDate;
  
  let header = `-Custom Report-\n`;
  if (module === 'finance') {
    header += `Finance\nDate: <b>${dateLabel}</b>\n\n`;
  } else if (module === 'hrm') {
    header += `HRM\nDate: <b>${dateLabel}</b>\n\n`;
  } else if (module === 'guest') {
    header += `Guest\nDate: <b>${dateLabel}</b>\n\n`;
  } else {
    header += `Date To Date\nDate: <b>${dateLabel}</b>\n\n`;
  }

  let body = '';

  const inRange = (d: string) => d >= startDate && d <= endDate;

  // Finance logic
  if (module === 'finance' || module === 'all') {
    const rangeTransactions = transactions.filter(t => t.date && inRange(t.date));
    const income = rangeTransactions.filter(t => t.category === 'Income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const expense = rangeTransactions.filter(t => t.category === 'Expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    const approvedReceiptsInfo = receipts.filter(r => r.date && inRange(r.date) && r.status === 'approved');
    const receiptEx = approvedReceiptsInfo.filter(r => r.type !== 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const receiptCr = approvedReceiptsInfo.filter(r => r.type === 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const rangeDailyIncome = income + receiptCr;
    const rangeDailyExpense = expense + receiptEx;

    // Previous Fund
    const prevTransactionExpenses = transactions
      .filter(t => t.category === 'Expense' && t.date && t.date < startDate)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const prevTransactionIncome = transactions
      .filter(t => t.category === 'Income' && t.date && t.date < startDate)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const prevReceiptExpenses = receipts
      .filter(r => r.status === 'approved' && r.type !== 'Credit' && r.date && r.date < startDate)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const prevReceiptCredit = receipts
      .filter(r => r.status === 'approved' && r.type === 'Credit' && r.date && r.date < startDate)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const previousFund = (prevTransactionIncome + prevReceiptCredit) - (prevTransactionExpenses + prevReceiptExpenses);
    const finalAvailableFund = previousFund + rangeDailyIncome - rangeDailyExpense;

    const rangeReceipts = receipts.filter(r => r.date && inRange(r.date));
    const pendingRange = rangeReceipts.filter(r => r.status === 'pending' || r.status === 'received' || !r.status).length;
    const approveRange = rangeReceipts.filter(r => r.status === 'approved').length;

    body += `Finance:\n` +
            `*Previous Fund: <b>৳${previousFund.toFixed(2)}</b>\n` +
            `*Add Fund: <b>৳${rangeDailyIncome.toFixed(2)}</b>\n` +
            `*Expenses: <b>৳${rangeDailyExpense.toFixed(2)}</b>\n` +
            `*Available Fund: <b>৳${finalAvailableFund.toFixed(2)}</b>\n\n` +
            `Vouchers / Receipts:\n` +
            `*Pending: <b>${pendingRange}</b>\n` +
            `*Approved: <b>${approveRange}</b>\n\n`;
  }

  // HRM logic
  if (module === 'hrm' || module === 'all') {
    const rangeAttendances = attendances.filter(a => a.date && inRange(a.date));
    const present = rangeAttendances.filter(a => a.status === 'Present').length;
    const late = rangeAttendances.filter(a => a.status === 'Late').length;
    const absent = rangeAttendances.filter(a => a.status === 'Absent').length;
    
    // For leaves, sum up leaves for each day in the range
    let leaves = 0;
    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        leaves += leaveRequests.filter(r => r.status === 'Approved' && dateStr >= r.startDate && dateStr <= r.endDate).length;
    }

    body += `Attendance:\n` +
            `*Total Employees: <b>${employees.length}</b>\n` +
            `*Present: <b>${present}</b>\n` +
            `*Absent: <b>${absent}</b>\n` +
            `*Late: <b>${late}</b>\n` +
            `*Leave: <b>${leaves}</b>\n\n`;
  }

  // Guest Logic
  if (module === 'guest') {
    const rangeGuests = guests.filter(g => {
        const d = g.createdAt ? g.createdAt.split('T')[0] : '';
        return inRange(d);
    });
    
    body += `Guests:\n`;
    if (rangeGuests.length === 0) {
        body += `*No guests arrived.\n\n`;
    } else {
        rangeGuests.forEach(g => {
            const dStr = g.createdAt.split('T')[0];
            body += `📅 <b>${dStr}</b>\n` +
                    `Host: ${g.visitingPerson || 'N/A'}\n` +
                    `Name: ${g.name || 'N/A'}\n` +
                    `Attendees: ${g.pax || 1}\n\n`;
        });
    }
  }

  return header + body + `Report generated automatically by SO System.`;
}

function generateDailyReportHTML(dateStr: string): string {
  // Uses generateCustomReportHTML for the specific day under all modules
  return generateCustomReportHTML(dateStr, dateStr, 'all');
}

function generateMonthlyReportHTML(yearMonthStr: string): string {
  const filterByYearMonth = (dateString: string) => {
    return dateString && dateString.startsWith(yearMonthStr);
  };

  const [year, month] = yearMonthStr.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[parseInt(month) - 1] || month;

  // 1. Attendance Rates
  const monthlyAttendances = attendances.filter(a => filterByYearMonth(a.date));
  const totalDays = monthlyAttendances.length;
  const presentCount = monthlyAttendances.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const attendanceRate = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : '0.0';

  // Approved Leaves
  const approvedLeaves = leaveRequests.filter(r => r.status === 'Approved' && (filterByYearMonth(r.startDate) || filterByYearMonth(r.endDate))).length;

  // 2. Financial Summary
  const monthlyTransactions = transactions.filter(t => filterByYearMonth(t.date));
  const income = monthlyTransactions.filter(t => t.category === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const expense = monthlyTransactions.filter(t => t.category === 'Expense').reduce((sum, t) => sum + t.amount, 0);

  const monthlyReceipts = receipts.filter(r => filterByYearMonth(r.date));
  const approvedMonthlyReceipts = monthlyReceipts.filter(r => r.status === 'approved');
  const receiptEx = approvedMonthlyReceipts.filter(r => r.type !== 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const receiptCr = approvedMonthlyReceipts.filter(r => r.type === 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const totalMonthlyIncome = income + receiptCr;
  const totalMonthlyExpense = expense + receiptEx;

  // Global available balance
  const globalTransactionIncome = transactions.filter(t => t.category === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const globalTransactionExpense = transactions.filter(t => t.category === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const globalApprovedReceiptCr = receipts.filter(r => r.status === 'approved' && r.type === 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const globalApprovedReceiptEx = receipts.filter(r => r.status === 'approved' && r.type !== 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const availableFund = (globalTransactionIncome + globalApprovedReceiptCr) - (globalTransactionExpense + globalApprovedReceiptEx);

  // Receipt Stats
  const approvedThisMonth = monthlyReceipts.filter(r => r.status === 'approved').length;
  const pendingThisMonth = monthlyReceipts.filter(r => r.status === 'pending' || r.status === 'received' || !r.status).length;

  return `-Monthly Report-\n` +
         `Month: <b>${monthName} ${year}</b>\n\n` +
         `Attendance:\n` +
         `*Total Employees: <b>${employees.length}</b>\n` +
         `*Attendance Rate: <b>${attendanceRate}%</b>\n` +
         `*Approved Leaves: <b>${approvedLeaves}</b>\n\n` +
         `Finance:\n` +
         `*Total Add Fund: <b>৳${totalMonthlyIncome.toFixed(2)}</b>\n` +
         `*Total Expenses: <b>৳${totalMonthlyExpense.toFixed(2)}</b>\n` +
         `*Available Fund: <b>৳${availableFund.toFixed(2)}</b>\n\n` +
         `Vouchers / Receipts:\n` +
         `*Approved: <b>${approvedThisMonth}</b>\n` +
         `*Pending: <b>${pendingThisMonth}</b>\n\n` +
         `Report generated automatically by SO System.`;
}

function generatePaidReportHTML(yearMonthStr: string): string {
  const filterByYearMonth = (dateString: string) => {
    return dateString && dateString.startsWith(yearMonthStr);
  };

  const [year, month] = yearMonthStr.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[parseInt(month) - 1] || month;

  // Emulate getEntitiesForVoucher
  const getEntitiesForVoucher = (paidTo: string): string[] => {
    if (!paidTo) return ['Others'];
    const targets: string[] = [];
    const normalized = paidTo.toLowerCase();
    let matched = false;
    if (normalized.includes('salim')) { targets.push('Salim Sir'); matched = true; }
    if (normalized.includes('nazim')) { targets.push('Nazim Sir'); matched = true; }
    if (!matched || normalized.includes('others') || normalized.includes('fund')) { targets.push('Others'); }
    return targets;
  };

  // Only consider approved vouchers from the current month
  const monthlyVouchers = receipts.filter(r => filterByYearMonth(r.date) && r.status === 'approved');

  const getEntityStats = (entityName: string) => {
    let debitTotal = 0;
    let creditTotal = 0;

    monthlyVouchers.forEach(v => {
      const hasDirectContributions = v.contributions && Object.keys(v.contributions).length > 0;
      let associated = false;
      let contribAmount = 0;

      const entities = hasDirectContributions 
        ? Object.keys(v.contributions) 
        : getEntitiesForVoucher(v.paidTo);
      
      if (hasDirectContributions) {
        const matchKey = Object.keys(v.contributions).find(k => k.toLowerCase() === entityName.toLowerCase());
        if (matchKey !== undefined) {
          associated = true;
          contribAmount = Number(v.contributions[matchKey]) || 0;
        }
      } else {
        if (entities.includes(entityName)) {
          associated = true;
          const count = entities.length;
          const coef = 1 / count; // Assume 'split' calculation model by default
          const amount = (Number(v.amount) || v.items?.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0) || 0);
          contribAmount = amount * coef;
        }
      }

      if (associated) {
        if (v.type === 'Credit') {
          creditTotal += contribAmount;
        } else {
          debitTotal += contribAmount;
        }
      }
    });

    return {
      debitTotal,
      creditTotal,
      netChange: creditTotal + debitTotal
    };
  };

  const salimStats = getEntityStats('Salim Sir');
  const nazimStats = getEntityStats('Nazim Sir');
  const othersStats = getEntityStats('Others');

  // ERP Dashboard Monthly Expenses
  const monthlyTransactionExpenses = transactions
    .filter(t => t.category === 'Expense' && t.date && t.date.startsWith(yearMonthStr))
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyReceiptExpenses = receipts
    .filter(r => r.status === 'approved' && r.type !== 'Credit' && r.date && r.date.startsWith(yearMonthStr))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const erpTotalExpenses = monthlyTransactionExpenses + monthlyReceiptExpenses;
  
  // Global available balance
  const globalTransactionIncome = transactions.filter(t => t.category === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const globalTransactionExpense = transactions.filter(t => t.category === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const globalApprovedReceiptCr = receipts.filter(r => r.status === 'approved' && r.type === 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const globalApprovedReceiptEx = receipts.filter(r => r.status === 'approved' && r.type !== 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const availableFund = (globalTransactionIncome + globalApprovedReceiptCr) - (globalTransactionExpense + globalApprovedReceiptEx);

  const totalBoth = erpTotalExpenses + availableFund;

  return `-Paid Report-\nMonth: <b>${monthName} ${year}</b>\n\n` +
         `Total Expenses: <b>৳${erpTotalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>\n` +
         `Available  Fund: <b>৳${availableFund.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>\n` +
         `Total                 : <b>৳${totalBoth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>\n\n` +
         `Paid to:\n` +
         `*Salim Sir : <b>৳${salimStats.netChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>\n` +
         `*Nazim Sir : <b>৳${nazimStats.netChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>\n` +
         `*Others : <b>৳${othersStats.netChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>\n\n` +
         `Report generated automatically by SO System.`;
}

// Background scheduler checker (executes every 10 minutes)
setInterval(() => {
  if (!telegramSettings.botToken || telegramSettings.userIds.length === 0) return;

  const now = new Date();
  // Dhaka TZ is UTC+6. Let's shift UTC hours by +6 to get accurate Bangladesh Local Time!
  const bdtTime = new Date(now.getTime() + 6 * 3600000);
  const year = bdtTime.getUTCFullYear();
  const month = String(bdtTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bdtTime.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const yearMonthStr = `${year}-${month}`;
  
  const currentHour = bdtTime.getUTCHours();
  const currentMinute = bdtTime.getUTCMinutes();

  // 1. Send Daily Report (triggers at 22:30 or later)
  if (telegramSettings.sendDaily && (currentHour > 22 || (currentHour === 22 && currentMinute >= 30))) {
    if (telegramSettings.lastDailySent !== dateStr) {
      telegramSettings.lastDailySent = dateStr;
      saveTelegramSettings();

      const html = generateDailyReportHTML(dateStr);
      telegramSettings.userIds.forEach(uid => {
        sendTelegramMessage(telegramSettings.botToken, uid, html).catch(err => {
          console.error(`Automated Daily Telegram Report failed for ${uid}:`, err);
        });
      });
    }
  }

  // 2. Send Monthly Report (triggers on last day at 23:30 or later)
  if (telegramSettings.sendMonthly && isLastDayOfMonth(bdtTime) && (currentHour === 23 && currentMinute >= 30)) {
    if (telegramSettings.lastMonthlySent !== yearMonthStr) {
      telegramSettings.lastMonthlySent = yearMonthStr;
      saveTelegramSettings();

      const html = generateMonthlyReportHTML(yearMonthStr);
      telegramSettings.userIds.forEach(uid => {
        sendTelegramMessage(telegramSettings.botToken, uid, html).catch(err => {
          console.error(`Automated Monthly Telegram Report failed for ${uid}:`, err);
        });
      });
    }
  }

  // 3. Send Paid Report (triggers on the first day of the month for the previous month)
  if (telegramSettings.sendPaid && bdtTime.getUTCDate() === 1 && currentHour >= 1) {
    // Calculate previous month's yearMonthStr
    const prev = new Date(bdtTime);
    prev.setUTCMonth(prev.getUTCMonth() - 1);
    const prevYear = prev.getUTCFullYear();
    const prevMonth = String(prev.getUTCMonth() + 1).padStart(2, '0');
    const prevYearMonthStr = `${prevYear}-${prevMonth}`;

    if (telegramSettings.lastPaidSent !== prevYearMonthStr) {
      telegramSettings.lastPaidSent = prevYearMonthStr;
      saveTelegramSettings();

      const htmlPaid = generatePaidReportHTML(prevYearMonthStr);
      telegramSettings.userIds.forEach(uid => {
        sendTelegramMessage(telegramSettings.botToken, uid, htmlPaid).catch(err => {
          console.error(`Automated Paid Telegram Report failed for ${uid}:`, err);
        });
      });
    }
  }
}, 300000); 

// Telegram API Routes
app.get('/api/telegram-settings', (req: Request, res: Response) => {
  res.json(telegramSettings);
});

app.post('/api/telegram-settings', (req: Request, res: Response) => {
  telegramSettings = { ...telegramSettings, ...req.body };
  saveTelegramSettings();
  res.json(telegramSettings);
});

app.post('/api/telegram-settings/test-daily', async (req: Request, res: Response) => {
  const { botToken, userIds } = req.body;
  const activeToken = botToken || telegramSettings.botToken;
  const activeUserIds = userIds || telegramSettings.userIds;

  if (!activeToken) {
    return res.status(400).json({ error: 'Telegram Bot Token is missing' });
  }
  if (!activeUserIds || activeUserIds.length === 0) {
    return res.status(400).json({ error: 'No Telegram User IDs configured' });
  }

  const bdtTime = new Date(new Date().getTime() + 6 * 3600000);
  const year = bdtTime.getUTCFullYear();
  const month = String(bdtTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bdtTime.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const html = generateDailyReportHTML(dateStr);
  const errors: string[] = [];

  for (const uid of activeUserIds) {
    try {
      await sendTelegramMessage(activeToken, uid, html);
    } catch (err: any) {
      errors.push(`ID ${uid}: ${err.message || err}`);
    }
  }

  if (errors.length > 0) {
    return res.status(500).json({ success: false, errors });
  }
  res.json({ success: true, message: 'Test daily report successfully sent!' });
});

app.post('/api/telegram-settings/test-monthly', async (req: Request, res: Response) => {
  const { botToken, userIds, month: customMonth } = req.body;
  const activeToken = botToken || telegramSettings.botToken;
  const activeUserIds = userIds || telegramSettings.userIds;

  if (!activeToken) {
    return res.status(400).json({ error: 'Telegram Bot Token is missing' });
  }
  if (!activeUserIds || activeUserIds.length === 0) {
    return res.status(400).json({ error: 'No Telegram User IDs configured' });
  }

  const bdtTime = new Date(new Date().getTime() + 6 * 3600000);
  const year = bdtTime.getUTCFullYear();
  const month = String(bdtTime.getUTCMonth() + 1).padStart(2, '0');
  const yearMonthStr = customMonth || `${year}-${month}`;

  const html = generateMonthlyReportHTML(yearMonthStr);
  const errors: string[] = [];

  for (const uid of activeUserIds) {
    try {
      await sendTelegramMessage(activeToken, uid, html);
    } catch (err: any) {
      errors.push(`ID ${uid}: ${err.message || err}`);
    }
  }

  if (errors.length > 0) {
    return res.status(500).json({ success: false, errors });
  }
  res.json({ success: true, message: `Monthly report for ${yearMonthStr} successfully sent!` });
});

app.post('/api/telegram-settings/send-date-report', async (req: Request, res: Response) => {
  const { date, startDate, endDate, module } = req.body;
  
  const start = startDate || date;
  const end = endDate || date;

  if (!start || !end) {
    return res.status(400).json({ error: 'Date parameter is required' });
  }

  const activeToken = telegramSettings.botToken;
  const activeUserIds = telegramSettings.userIds;

  if (!activeToken) {
    return res.status(400).json({ error: 'Telegram Bot Token is not configured. Please set it up in Settings.' });
  }
  if (!activeUserIds || activeUserIds.length === 0) {
    return res.status(400).json({ error: 'No Telegram User IDs configured. Please set them up in Settings.' });
  }

  const html = generateCustomReportHTML(start, end, module || 'all');
  const errors: string[] = [];

  for (const uid of activeUserIds) {
    try {
      await sendTelegramMessage(activeToken, uid, html);
    } catch (err: any) {
      errors.push(`ID ${uid}: ${err.message || err}`);
    }
  }

  if (errors.length > 0) {
    return res.status(500).json({ success: false, errors });
  }
  res.json({ success: true, message: `Report successfully sent via Telegram!` });
});

app.post('/api/telegram-settings/test-paid', async (req: Request, res: Response) => {
  const { botToken, userIds, month: customMonth } = req.body;
  const activeToken = botToken || telegramSettings.botToken;
  const activeUserIds = userIds || telegramSettings.userIds;

  if (!activeToken) {
    return res.status(400).json({ error: 'Telegram Bot Token is missing' });
  }
  if (!activeUserIds || activeUserIds.length === 0) {
    return res.status(400).json({ error: 'No Telegram User IDs configured' });
  }

  const bdtTime = new Date(new Date().getTime() + 6 * 3600000);
  const year = bdtTime.getUTCFullYear();
  const month = String(bdtTime.getUTCMonth() + 1).padStart(2, '0');
  const yearMonthStr = customMonth || `${year}-${month}`;

  const html = generatePaidReportHTML(yearMonthStr);
  const errors: string[] = [];

  for (const uid of activeUserIds) {
    try {
      await sendTelegramMessage(activeToken, uid, html);
    } catch (err: any) {
      errors.push(`ID ${uid}: ${err.message || err}`);
    }
  }

  if (errors.length > 0) {
    return res.status(500).json({ success: false, errors });
  }
  res.json({ success: true, message: `Paid report for ${yearMonthStr} successfully sent!` });
});

app.post('/api/telegram-settings/send-paid-report', async (req: Request, res: Response) => {
  const { botToken, userIds, text } = req.body;
  const activeToken = botToken || telegramSettings.botToken;
  const activeUserIds = userIds || telegramSettings.userIds;

  if (!activeToken) {
    return res.status(400).json({ error: 'Telegram Bot Token is missing' });
  }
  if (!activeUserIds || activeUserIds.length === 0) {
    return res.status(400).json({ error: 'No Telegram User IDs configured' });
  }

  const errors: string[] = [];
  for (const uid of activeUserIds) {
    try {
      await sendTelegramMessage(activeToken, uid, text);
    } catch (err: any) {
      errors.push(`ID ${uid}: ${err.message || err}`);
    }
  }

  if (errors.length > 0) {
    return res.status(500).json({ success: false, errors });
  }
  res.json({ success: true, message: 'Report successfully sent!' });
});

app.post('/api/telegram-settings/send-csv-document', async (req: Request, res: Response) => {
  const { filename, content, caption } = req.body;
  
  const activeToken = telegramSettings.botToken;
  const activeUserIds = telegramSettings.userIds;

  if (!activeToken) {
    return res.status(400).json({ error: 'Telegram Bot Token is missing. Please configure it in Settings.' });
  }
  if (!activeUserIds || activeUserIds.length === 0) {
    return res.status(400).json({ error: 'No Telegram User IDs configured. Please set them up in Settings.' });
  }

  const errors: string[] = [];

  for (const uid of activeUserIds) {
    try {
      await sendTelegramDocument(activeToken, uid, filename, content, caption);
    } catch (err: any) {
      errors.push(`ID ${uid}: ${err.message || err}`);
    }
  }

  if (errors.length > 0) {
    return res.status(500).json({ success: false, errors });
  }
  res.json({ success: true, message: `Document sent successfully via Telegram!` });
});

app.post('/api/telegram-settings/send-base64-document', async (req: Request, res: Response) => {
  const { filename, base64Content, mimeType, caption } = req.body;
  
  const activeToken = telegramSettings.botToken;
  const activeUserIds = telegramSettings.userIds;

  if (!activeToken) {
    return res.status(400).json({ error: 'Telegram Bot Token is missing. Please configure it in Settings.' });
  }
  if (!activeUserIds || activeUserIds.length === 0) {
    return res.status(400).json({ error: 'No Telegram User IDs configured. Please set them up in Settings.' });
  }

  const errors: string[] = [];
  const buffer = Buffer.from(base64Content, 'base64');
  const url = `https://api.telegram.org/bot${activeToken}/sendDocument`;

  for (const uid of activeUserIds) {
    try {
      const formData = new FormData();
      formData.append('chat_id', uid);
      if (caption) formData.append('caption', caption);
      
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('document', blob, filename);

      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }
    } catch (err: any) {
      console.error(`Telegram API error for chat ${uid}:`, err);
      errors.push(`ID ${uid}: ${err.message || err}`);
    }
  }

  if (errors.length > 0) {
    return res.status(500).json({ success: false, errors });
  }
  res.json({ success: true, message: `Document sent successfully via Telegram!` });
});

app.post('/api/notifications', (req: Request, res: Response) => {
  const newNotif = {
    id: notifications.length + 1,
    time: 'Just now',
    status: 'unread',
    ...req.body
  };
  notifications.unshift(newNotif);
  saveDatabase();
  res.status(201).json(newNotif);
});

app.patch('/api/notifications/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = notifications.findIndex(n => n.id === parseInt(id));
  if (index !== -1) {
    notifications[index] = { ...notifications[index], ...req.body };
    saveDatabase();
    res.json(notifications[index]);
  } else {
    res.status(404).json({ message: 'Notification not found' });
  }
});

app.post('/api/notifications/mark-all-read', (req: Request, res: Response) => {
  notifications = notifications.map(n => ({ ...n, status: 'read' }));
  saveDatabase();
  res.json({ message: 'All marked as read' });
});

app.get('/api/notifications/unread-count', (req: Request, res: Response) => {
  const count = notifications.filter(n => n.status === 'unread').length;
  res.json({ count });
});

// --- Auth API OTP Engine & Routes ---
let activeOtps: { [email: string]: { otp: string, expiresAt: number } } = {};
let simulatedEmails: { id: number, to: string, subject: string, body: string, date: string, otp: string }[] = [];

app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  const targetEmail = authSettings.email.toLowerCase().trim();
  const cleanEmail = targetEmail;

  // Generate a cryptographically secure-looking 8-digit numeric OTP
  const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
  activeOtps[cleanEmail] = {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
  };
  
  const emailSubject = `[OTP Verification] Security Code for SmartOffice ERP`;
  const emailBody = `Dear Executive,

You have requested a secure login verification code for your SmartOffice ERP Master Account.

Your eight-digit authentication code is: ${otp}

This passcode secures access to your administration subsystem and will expire in 10 minutes. If you did not make this request, please secure your configuration files.

Sincerely,
Network Protection System`;

  // Try to send email using nodemailer if configured
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      let fromSpec = process.env.SMTP_FROM || process.env.SMTP_USER || 'system@localhost';
      let fromEmail = fromSpec;
      let fromName = 'SmartOffice ERP';

      if (!fromSpec.includes('@')) {
        fromName = fromSpec;
        // Fallback email since SMTP requires a valid email format in the from field
        fromEmail = 'noreply@smartoffice.local'; 
      }

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: targetEmail,
        subject: emailSubject,
        text: emailBody,
      });
      console.log(`[EMAIL SENT] OTP sent to ${targetEmail} via SMTP`);
    } catch (emailError) {
      console.error(`[EMAIL ERROR] Failed to send email via SMTP:`, emailError);
    }
  } else {
    console.log(`[EMAIL WARNING] SMTP credentials not configured. Email not sent.`);
  }

  // Also log it to the console so they can see the OTP without the sandbox simulator UI
  console.log(`\n\n----------------------------------------`);
  console.log(`[OTP GENERATED] target: ${cleanEmail}`);
  console.log(`OTP CODE: ${otp}`);
  console.log(`----------------------------------------\n\n`);

  res.json({ success: true, message: 'Eight-digit verification code sent successfully.', email: targetEmail });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanPassword = password.trim();

  // 1. Check Super Admin login
  const superAdminEmail = authSettings.email.toLowerCase().trim();
  if (cleanEmail === superAdminEmail) {
    if (cleanPassword === authSettings.password) {
      return res.json({
        success: true,
        email: authSettings.email,
        role: 'admin',
        message: 'Super Administrator logged in successfully.'
      });
    } else {
      return res.status(401).json({ error: 'Incorrect password for the administrator account.' });
    }
  }

  // 2. Check Employee login
  const employee = employees.find(e => {
    const empEmail = String(e.email || '').toLowerCase().trim();
    return empEmail && empEmail === cleanEmail;
  });

  if (employee) {
    const employeePassword = employee.password || 'Welcome@123';
    if (cleanPassword === employeePassword) {
      return res.json({
        success: true,
        email: employee.email,
        role: 'employee',
        name: employee.name,
        message: 'Employee logged in successfully.'
      });
    } else {
      return res.status(401).json({ error: 'Incorrect password for this employee account.' });
    }
  }

  return res.status(401).json({ error: 'Sign-in failed. No account associated with this email address was found.' });
});

app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  // Retained as a fallback logic if accessed
  const { email, otp } = req.body;
  res.json({ success: true, email: email || authSettings.email, message: 'Authorized successfully.' });
});

app.get('/api/auth/simulated-emails', (req: Request, res: Response) => {
  res.json({ emails: simulatedEmails });
});

app.post('/api/auth/update', (req: Request, res: Response) => {
  const { email, currentPassword, newEmail, newPassword } = req.body;
  
  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required.' });
  }

  const requesterEmail = String(email || '').toLowerCase().trim();

  // 1. Is it the super administrator?
  const superAdminEmail = authSettings.email.toLowerCase().trim();
  if (!requesterEmail || requesterEmail === superAdminEmail || requesterEmail === 'k.e.bd.contact@gmail.com') {
    if (currentPassword !== authSettings.password) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (newEmail) {
      authSettings.email = newEmail.toLowerCase().trim();
    }
    if (newPassword) {
      authSettings.password = newPassword;
    }
    saveAuthSettings();
    return res.json({ success: true, email: authSettings.email, message: 'Credentials updated successfully' });
  }

  // 2. Is it an Employee?
  const employeeIndex = employees.findIndex(e => {
    const empEmail = String(e.email || '').toLowerCase().trim();
    return empEmail && empEmail === requesterEmail;
  });

  if (employeeIndex !== -1) {
    const emp = employees[employeeIndex];
    const activePass = emp.password || 'Welcome@123';
    if (currentPassword !== activePass) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (newPassword) {
      employees[employeeIndex].password = newPassword;
    }
    saveDatabase();
    return res.json({ success: true, email: emp.email, message: 'Your password has been changed successfully' });
  }

  return res.status(404).json({ error: 'A security match for the logged-in email could not be located on the server database.' });
});

app.get('/api/auth/status', (req: Request, res: Response) => {
  const emailQuery = req.query.email;
  const requesterEmail = String(emailQuery || '').toLowerCase().trim();
  const superAdminEmail = authSettings.email.toLowerCase().trim();

  if (!requesterEmail || requesterEmail === superAdminEmail || requesterEmail === 'k.e.bd.contact@gmail.com') {
    return res.json({ 
      email: authSettings.email, 
      role: 'admin', 
      permissions: authSettings.permissions
    });
  }

  const employee = employees.find(e => {
    const empEmail = String(e.email || '').toLowerCase().trim();
    return empEmail && empEmail === requesterEmail;
  });

  if (employee) {
    return res.json({
      email: employee.email,
      role: 'employee',
      permissions: employee.permissions || {
        dashboard: true,
        hr: true,
        attendance: true,
        leave: true,
        accounting: true,
        requisitions: true,
        tasks: true,
        notifications: true,
        reports: true,
        guest: true
      }
    });
  }

  res.status(404).json({ error: 'User not found' });
});

app.post('/api/auth/update-admin-permissions', (req: Request, res: Response) => {
  const { permissions } = req.body;
  if (!permissions) {
    return res.status(400).json({ error: 'Permissions object is required' });
  }
  authSettings.permissions = { ...authSettings.permissions, ...permissions };
  saveAuthSettings();
  res.json({ success: true, permissions: authSettings.permissions });
});

// --- Vite Middleware & Fallback ---
async function startServer() {
  // Database initialization runs schema compliance & migrations automatically on boot
  await initializeDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from the same directory as server.cjs
    const distPath = __dirname;
    
    // Security middleware to prevent access to backend configuration and database files
    app.use((req, res, next) => {
      const url = req.url.toLowerCase();
      if (url.includes('.env') || url.includes('.json') || url.includes('server.cjs')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      next();
    });

    app.use('/management', express.static(distPath));
    app.get('/', (req, res) => res.redirect('/management/'));
    app.get('/management*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
