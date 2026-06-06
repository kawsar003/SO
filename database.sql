-- MySQL Schema for ERP System

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  department VARCHAR(100),
  designation VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Active',
  password VARCHAR(255),
  role VARCHAR(50) DEFAULT 'employee',
  joiningDate DATE,
  employeeIdNumber VARCHAR(50),
  whatsappNumber VARCHAR(50),
  cvUrl LONGTEXT,
  cvFilename VARCHAR(255),
  photoUrl LONGTEXT,
  basicSalary INT DEFAULT 15000,
  advanceSalary INT DEFAULT 0,
  customBonus INT DEFAULT -1
);

CREATE TABLE IF NOT EXISTS attendances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeId INT,
  date DATE,
  checkIn TIME,
  checkOut TIME,
  status VARCHAR(20),
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeId INT,
  type VARCHAR(50),
  startDate DATE,
  endDate DATE,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'Pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('Credit', 'Debit'),
  name VARCHAR(255),
  date DATE,
  description TEXT,
  amount DECIMAL(15, 2),
  status VARCHAR(20) DEFAULT 'pending',
  paidTo VARCHAR(255),
  note TEXT,
  receiptAttached BOOLEAN DEFAULT FALSE,
  contributions JSON,
  employeeId INT NULL DEFAULT NULL,
  purpose VARCHAR(50) DEFAULT 'General',
  salaryMonth VARCHAR(20) NULL DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS receipt_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receiptId INT,
  description VARCHAR(255),
  quantity INT,
  amount DECIMAL(15, 2),
  FOREIGN KEY (receiptId) REFERENCES receipts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE,
  category VARCHAR(100),
  amount DECIMAL(15, 2),
  description TEXT,
  type ENUM('Income', 'Expense')
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  status VARCHAR(20) DEFAULT 'To Do',
  priority VARCHAR(20),
  dueDate DATE,
  assignedTo INT,
  FOREIGN KEY (assignedTo) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS guests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(50),
  visitingPerson VARCHAR(255),
  reason TEXT,
  pax INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  time VARCHAR(50),
  status VARCHAR(20) DEFAULT 'unread',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);