import path from 'path';
import fs from 'fs';

// Try loading better-sqlite3 ONLY in non-serverless environments (local dev)
let BetterSqlite3: any = null;
if (!process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL) {
  try {
    BetterSqlite3 = require('better-sqlite3');
  } catch {
    BetterSqlite3 = null;
  }
}

let db: any = null;

// In-memory fallback store for serverless environments where native better-sqlite3 cannot run
function createInMemoryStore(dbPath: string) {
  const bcrypt = require('bcryptjs');
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  const state: any = {
    users: [
      {
        id: 'user_01',
        organization_id: 'org_001',
        name: 'Dhyan',
        email: 'admin@complianceos.com',
        password_hash: passwordHash,
        department_id: 'dept_08',
        designation: 'Super Admin',
        role_id: 'role_01',
        role_name: 'Super Admin',
        department_name: 'Management',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    organizations: [
      { id: 'org_001', name: 'Enterprise Compliance Group', status: 'active', financial_year_start: 4 }
    ],
    roles: [
      { id: 'role_01', name: 'Super Admin', description: 'Root authority with full unrestricted administrative control', is_system: 1 },
      { id: 'role_02', name: 'Admin', description: 'System Administrator', is_system: 1 },
      { id: 'role_03', name: 'User', description: 'Standard Staff', is_system: 1 },
    ],
    departments: [
      { id: 'dept_01', organization_id: 'org_001', name: 'Finance' },
      { id: 'dept_02', organization_id: 'org_001', name: 'Taxation' },
      { id: 'dept_03', organization_id: 'org_001', name: 'HR' },
      { id: 'dept_04', organization_id: 'org_001', name: 'Legal' },
      { id: 'dept_05', organization_id: 'org_001', name: 'Secretarial' },
      { id: 'dept_06', organization_id: 'org_001', name: 'Accounts' },
      { id: 'dept_07', organization_id: 'org_001', name: 'Operations' },
      { id: 'dept_08', organization_id: 'org_001', name: 'Management' },
    ],
    firms: [],
    compliances: [],
    compliance_categories: [
      { id: 'cat_01', name: 'GST', code: 'GST', description: 'Goods and Services Tax', color: '#10B981', icon: '🧾', sort_order: 1, status: 'active' },
      { id: 'cat_02', name: 'Income Tax', code: 'IT', description: 'Income Tax compliances', color: '#3B82F6', icon: '💰', sort_order: 2, status: 'active' },
      { id: 'cat_03', name: 'TDS', code: 'TDS', description: 'Tax Deducted at Source', color: '#8B5CF6', icon: '📊', sort_order: 3, status: 'active' },
      { id: 'cat_04', name: 'ROC / MCA', code: 'MCA', description: 'Ministry of Corporate Affairs filings', color: '#F59E0B', icon: '🏛️', sort_order: 4, status: 'active' },
      { id: 'cat_05', name: 'PF', code: 'PF', description: 'Provident Fund', color: '#EF4444', icon: '👥', sort_order: 5, status: 'active' },
      { id: 'cat_06', name: 'ESI', code: 'ESI', description: 'Employee State Insurance', color: '#EC4899', icon: '🏥', sort_order: 6, status: 'active' },
    ],
    compliance_tasks: [],
    audit_logs: [
      {
        id: 'audit_01',
        organization_id: 'org_001',
        user_id: 'user_01',
        user_name: 'Dhyan',
        action: 'SYSTEM_INITIALIZED',
        entity_type: 'system',
        entity_id: 'org_001',
        entity_name: 'ComplianceOS Platform Initialized',
        new_data: JSON.stringify({ admin: 'Dhyan', role: 'Super Admin' }),
        created_at: new Date().toISOString()
      }
    ],
    system_settings: {
      org_name: 'Enterprise Compliance Group',
      financial_year_start: '4',
      date_format: 'DD MMM YYYY',
      timezone: 'Asia/Kolkata',
    },
    notifications: []
  };

  // Try to load any persisted state from /tmp
  const jsonPath = '/tmp/compliance_data.json';
  try {
    if (fs.existsSync(jsonPath)) {
      const saved = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      Object.assign(state, saved);
    }
  } catch {}

  function persist() {
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(state));
    } catch {}
  }

  return {
    prepare(sql: string) {
      const lower = sql.toLowerCase();
      return {
        get(...rawParams: any[]) {
          const params = (rawParams.length === 1 && Array.isArray(rawParams[0])) ? rawParams[0] : rawParams;
          
          if (lower.includes('from users')) {
            if (params.length > 0) {
              const target = String(params[0]).toLowerCase().trim();
              const found = state.users.find((u: any) => u.email.toLowerCase() === target || u.id === target);
              if (found) {
                return {
                  ...found,
                  role_name: found.role_name || 'Super Admin',
                  department_name: found.department_name || 'Management'
                };
              }
            }
            return state.users[0];
          }

          if (lower.includes('from organizations')) {
            return state.organizations[0];
          }

          if (lower.includes('select count(*)')) {
            if (lower.includes('from compliance_tasks')) return { total: state.compliance_tasks.length, count: state.compliance_tasks.length, overdue: 0, pending: 0, completed: 0 };
            if (lower.includes('from firms')) return { count: state.firms.length, total: state.firms.length };
            if (lower.includes('from organizations')) return { count: state.organizations.length };
            return { count: 0, total: 0 };
          }

          if (lower.includes('from system_settings')) {
            const key = params[0];
            return { key, value: state.system_settings[key] || '' };
          }

          return undefined;
        },

        all(...rawParams: any[]) {
          const params = (rawParams.length === 1 && Array.isArray(rawParams[0])) ? rawParams[0] : rawParams;
          
          if (lower.includes('from users')) return state.users;
          if (lower.includes('from firms')) return state.firms;
          if (lower.includes('from compliance_categories')) return state.compliance_categories;
          if (lower.includes('from compliances')) return state.compliances;
          if (lower.includes('from compliance_tasks')) return state.compliance_tasks;
          if (lower.includes('from departments')) return state.departments;
          if (lower.includes('from roles')) return state.roles;
          if (lower.includes('from audit_logs')) return state.audit_logs;
          if (lower.includes('from notifications')) return state.notifications;
          return [];
        },

        run(...rawParams: any[]) {
          const params = (rawParams.length === 1 && Array.isArray(rawParams[0])) ? rawParams[0] : rawParams;
          
          if (lower.startsWith('update users')) {
            if (state.users.length > 0) {
              state.users[0].last_login = new Date().toISOString();
              persist();
            }
          } else if (lower.startsWith('insert into audit_logs')) {
            state.audit_logs.unshift({
              id: 'audit_' + Date.now(),
              created_at: new Date().toISOString()
            });
            persist();
          } else if (lower.startsWith('insert into firms')) {
            persist();
          } else if (lower.startsWith('insert into compliance_tasks')) {
            persist();
          }
          return { changes: 1, lastInsertRowid: Date.now() };
        }
      };
    },

    exec(sql: string) {},
    pragma(sql: string) {},
    transaction(fn: Function) {
      return (...args: any[]) => fn(...args);
    }
  };
}

export function getDb(): any {
  if (db) return db;
  
  let dbPath = process.env.DATABASE_PATH;
  
  if (!dbPath) {
    const defaultPath = path.join(process.cwd(), 'data', 'compliance.db');
    const defaultDir = path.dirname(defaultPath);
    try {
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      fs.accessSync(defaultDir, fs.constants.W_OK);
      dbPath = defaultPath;
    } catch {
      dbPath = path.join('/tmp', 'compliance.db');
      const tmpDir = path.dirname(dbPath);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      if (fs.existsSync(defaultPath) && !fs.existsSync(/*turbopackIgnore: true*/ dbPath)) {
        try {
          fs.copyFileSync(defaultPath, dbPath);
        } catch (copyErr) {
          console.warn('Could not copy bundled db to /tmp:', copyErr);
        }
      }
    }
  } else {
    const customDir = path.dirname(dbPath);
    try {
      if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir, { recursive: true });
      }
    } catch {
      dbPath = path.join('/tmp', 'compliance.db');
      const tmpDir = path.dirname(dbPath);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    }
  }
  
  // 1. Try BetterSqlite3 if available (local development)
  if (BetterSqlite3) {
    try {
      db = new BetterSqlite3(dbPath);
      try {
        db.pragma('journal_mode = WAL');
      } catch {
        db.pragma('journal_mode = DELETE');
      }
      db.pragma('foreign_keys = ON');
      initializeSchema(db);
      return db;
    } catch (nativeErr) {
      console.warn('better-sqlite3 runtime failed, falling back to in-memory store:', nativeErr);
    }
  }
  
  // 2. Fallback to resilient in-memory store (serverless environments)
  db = createInMemoryStore(dbPath);
  return db;
}

function ensureAdminUser(db: any) {
  try {
    const adminUser = db.prepare("SELECT id FROM users WHERE LOWER(email) = 'admin@complianceos.com'").get();
    if (!adminUser) {
      const bcrypt = require('bcryptjs');
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const passwordHash = bcrypt.hashSync(adminPassword, 10);
      db.prepare("INSERT INTO users (id, organization_id, name, email, password_hash, department_id, designation, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        'user_01', 'org_001', 'Dhyan', 'admin@complianceos.com', passwordHash, 'dept_08', 'Super Admin', 'role_01'
      );
    }
  } catch (e) {
    console.warn('ensureAdminUser check skipped:', e);
  }
}

function initializeSchema(db: any) {
  const initialized = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='organizations'").get();
  if (initialized) {
    ensureAdminUser(db);
    return;
  }
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      address TEXT,
      logo_url TEXT,
      financial_year_start INTEGER DEFAULT 4,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entity_types (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      organization_id TEXT REFERENCES organizations(id),
      name TEXT NOT NULL,
      head_user_id TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT,
      UNIQUE(module, action)
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT REFERENCES roles(id),
      permission_id TEXT REFERENCES permissions(id),
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      organization_id TEXT REFERENCES organizations(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      employee_id TEXT,
      department_id TEXT REFERENCES departments(id),
      designation TEXT,
      role_id TEXT REFERENCES roles(id),
      avatar_url TEXT,
      status TEXT DEFAULT 'active',
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_firm_access (
      user_id TEXT REFERENCES users(id),
      firm_id TEXT,
      PRIMARY KEY (user_id, firm_id)
    );

    CREATE TABLE IF NOT EXISTS firms (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      organization_id TEXT REFERENCES organizations(id),
      legal_name TEXT NOT NULL,
      display_name TEXT,
      entity_type_id TEXT REFERENCES entity_types(id),
      registration_number TEXT,
      cin TEXT,
      llpin TEXT,
      incorporation_date TEXT,
      pan TEXT,
      tan TEXT,
      gstin TEXT,
      financial_year TEXT DEFAULT 'April-March',
      registered_address TEXT,
      communication_address TEXT,
      state TEXT,
      city TEXT,
      pin_code TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      industry TEXT,
      business_type TEXT,
      employee_count INTEGER DEFAULT 0,
      turnover_band TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS firm_contacts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      firm_id TEXT REFERENCES firms(id),
      contact_type TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      designation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS firm_registrations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      firm_id TEXT REFERENCES firms(id),
      registration_type TEXT NOT NULL,
      registration_number TEXT,
      registration_date TEXT,
      expiry_date TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS compliance_categories (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#4F46E5',
      icon TEXT DEFAULT '📋',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compliances (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      category_id TEXT REFERENCES compliance_categories(id),
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      description TEXT,
      authority TEXT,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      due_date_rule TEXT,
      due_day INTEGER,
      grace_period_days INTEGER DEFAULT 0,
      penalty_info TEXT,
      priority TEXT DEFAULT 'medium',
      default_department_id TEXT REFERENCES departments(id),
      default_assignee_id TEXT,
      reviewer_id TEXT,
      required_documents TEXT,
      mis_template TEXT,
      regulatory_reference TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compliance_rules (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      compliance_id TEXT REFERENCES compliances(id),
      entity_type_id TEXT,
      state TEXT,
      condition_type TEXT,
      condition_field TEXT,
      condition_operator TEXT,
      condition_value TEXT,
      priority INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS firm_compliances (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      firm_id TEXT REFERENCES firms(id),
      compliance_id TEXT REFERENCES compliances(id),
      source TEXT DEFAULT 'auto',
      enabled INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      override_frequency TEXT,
      override_due_day INTEGER,
      override_department_id TEXT,
      override_assignee_id TEXT,
      default_department_id TEXT,
      default_assignee_id TEXT,
      override_reviewer_id TEXT,
      effective_from TEXT,
      effective_to TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(firm_id, compliance_id)
    );

    CREATE TABLE IF NOT EXISTS compliance_tasks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      task_number TEXT UNIQUE,
      firm_id TEXT REFERENCES firms(id),
      compliance_id TEXT REFERENCES compliances(id),
      firm_compliance_id TEXT REFERENCES firm_compliances(id),
      period TEXT,
      financial_year TEXT,
      due_date TEXT NOT NULL,
      original_due_date TEXT,
      department_id TEXT REFERENCES departments(id),
      assignee_id TEXT REFERENCES users(id),
      reviewer_id TEXT REFERENCES users(id),
      status TEXT DEFAULT 'not_started',
      priority TEXT DEFAULT 'medium',
      created_by TEXT REFERENCES users(id),
      completed_at DATETIME,
      submitted_at DATETIME,
      approved_at DATETIME,
      approved_by TEXT,
      rejection_reason TEXT,
      reschedule_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mis_records (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      task_id TEXT REFERENCES compliance_tasks(id),
      field_name TEXT NOT NULL,
      field_value TEXT,
      field_type TEXT DEFAULT 'text',
      updated_by TEXT REFERENCES users(id),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mis_templates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      compliance_id TEXT REFERENCES compliances(id),
      field_name TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_type TEXT DEFAULT 'text',
      is_required INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      options TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      firm_id TEXT REFERENCES firms(id),
      task_id TEXT REFERENCES compliance_tasks(id),
      compliance_id TEXT,
      financial_year TEXT,
      period TEXT,
      document_type TEXT,
      file_name TEXT NOT NULL,
      original_name TEXT DEFAULT '',
      mime_type TEXT,
      file_size INTEGER,
      storage_path TEXT,
      file_path TEXT,
      uploaded_by TEXT REFERENCES users(id),
      status TEXT DEFAULT 'active',
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      document_id TEXT REFERENCES documents(id),
      version INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      file_size INTEGER,
      uploaded_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      task_id TEXT REFERENCES compliance_tasks(id),
      user_id TEXT REFERENCES users(id),
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      task_id TEXT REFERENCES compliance_tasks(id),
      reviewer_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      entity_type TEXT,
      entity_id TEXT,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reminder_rules (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      compliance_id TEXT,
      days_before INTEGER NOT NULL,
      channel TEXT DEFAULT 'app',
      is_active INTEGER DEFAULT 1,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      organization_id TEXT,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      entity_name TEXT,
      old_data TEXT,
      new_data TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saved_filters (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      page TEXT NOT NULL,
      filters TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_firms_org ON firms(organization_id);
    CREATE INDEX IF NOT EXISTS idx_firms_status ON firms(status);
    CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_firm ON compliance_tasks(firm_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON compliance_tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON compliance_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON compliance_tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_compliance ON compliance_tasks(compliance_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_firm_status ON compliance_tasks(firm_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_firm_due ON compliance_tasks(firm_id, due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON compliance_tasks(assignee_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON compliance_tasks(status, due_date);
    CREATE INDEX IF NOT EXISTS idx_documents_task ON documents(task_id);
    CREATE INDEX IF NOT EXISTS idx_documents_firm ON documents(firm_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read_at);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
    CREATE INDEX IF NOT EXISTS idx_mis_task ON mis_records(task_id);
    CREATE INDEX IF NOT EXISTS idx_firm_compliances_firm ON firm_compliances(firm_id);
    CREATE INDEX IF NOT EXISTS idx_compliance_rules_compliance ON compliance_rules(compliance_id);

    -- Full Text Search Index
    CREATE TABLE IF NOT EXISTS search_index (
      entity_type TEXT,
      entity_id TEXT,
      title TEXT,
      subtitle TEXT,
      content TEXT,
      firm_name TEXT
    );
  `);
  
  seedData(db);
}

function seedData(db: any) {
  const hasData = db.prepare("SELECT COUNT(*) as count FROM organizations").get() as { count: number };
  if (hasData.count > 0) return;
  
  const bcrypt = require('bcryptjs');
  const orgId = 'org_001';
  
  // Organization
  db.prepare("INSERT INTO organizations (id, name, status) VALUES (?, ?, 'active')").run(orgId, 'Enterprise Compliance Group');

  // Entity Types
  const entityTypes = [
    ['et_01', 'Private Limited Company', 'PRIVATE_LIMITED', 'Private Limited Company registered under Companies Act'],
    ['et_02', 'Public Limited Company', 'PUBLIC_LIMITED', 'Public Limited Company'],
    ['et_03', 'Limited Liability Partnership', 'LLP', 'LLP registered under LLP Act 2008'],
    ['et_04', 'Partnership Firm', 'PARTNERSHIP', 'Partnership firm under Partnership Act'],
    ['et_05', 'Proprietorship', 'PROPRIETORSHIP', 'Sole proprietorship'],
    ['et_06', 'Trust', 'TRUST', 'Trust registered under Trust Act'],
    ['et_07', 'Society', 'SOCIETY', 'Society registered under Societies Act'],
  ];
  const etStmt = db.prepare("INSERT INTO entity_types (id, name, code, description) VALUES (?, ?, ?, ?)");
  entityTypes.forEach(et => etStmt.run(...et));

  // Departments
  const departments = [
    ['dept_01', 'Finance'], ['dept_02', 'Taxation'], ['dept_03', 'HR'],
    ['dept_04', 'Legal'], ['dept_05', 'Secretarial'], ['dept_06', 'Accounts'],
    ['dept_07', 'Operations'], ['dept_08', 'Management'],
  ];
  const deptStmt = db.prepare("INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)");
  departments.forEach(d => deptStmt.run(d[0], orgId, d[1]));

  // Roles - Super Admin (Strictly 1), Admin, and User
  const roles = [
    ['role_01', 'Super Admin', 'Root authority with full unrestricted administrative control. Only 1 Super Admin permitted.', 1],
    ['role_02', 'Admin', 'System Administrator with full operational management and user permissions assignment rights.', 1],
    ['role_03', 'User', 'Standard Staff & Compliance Officer. Operates compliance workflows based on assigned permissions.', 1],
  ];
  const roleStmt = db.prepare("INSERT INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?)");
  roles.forEach(r => roleStmt.run(...r));

  // Permissions
  const modules = ['dashboard', 'firms', 'compliance', 'calendar', 'tasks', 'documents', 'reports', 'users', 'audit', 'settings', 'notifications'];
  const actions = ['view', 'create', 'edit', 'delete', 'assign', 'submit', 'review', 'approve', 'export', 'download'];
  const permStmt = db.prepare("INSERT INTO permissions (id, module, action) VALUES (?, ?, ?)");
  let permIdx = 0;
  const permIds: Record<string, string> = {};
  modules.forEach(m => {
    actions.forEach(a => {
      const pid = `perm_${String(++permIdx).padStart(3, '0')}`;
      permIds[`${m}:${a}`] = pid;
      permStmt.run(pid, m, a);
    });
  });

  // Role Permissions
  const rpStmt = db.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
  
  // 1. Super Admin: all 110 permissions
  Object.values(permIds).forEach(pid => rpStmt.run('role_01', pid));

  // 2. Admin: full operational and user management permissions
  Object.entries(permIds).forEach(([key, pid]) => {
    rpStmt.run('role_02', pid);
  });

  // 3. User: standard operational compliance & document permissions
  const userAllowedPrefixes = [
    'dashboard:view', 'dashboard:export',
    'firms:view',
    'compliance:view',
    'calendar:view', 'calendar:export',
    'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:submit', 'tasks:download',
    'documents:view', 'documents:create', 'documents:download',
    'reports:view', 'reports:export',
    'notifications:view'
  ];
  userAllowedPrefixes.forEach(key => {
    if (permIds[key]) {
      rpStmt.run('role_03', permIds[key]);
    }
  });

  // Users - Only Dhyan (Super Admin)
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  const userStmt = db.prepare("INSERT INTO users (id, organization_id, name, email, password_hash, department_id, designation, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  userStmt.run('user_01', orgId, 'Dhyan', 'admin@complianceos.com', passwordHash, 'dept_08', 'Super Admin', 'role_01');

  // Compliance Categories
  const categories = [
    ['cat_01', 'GST', 'GST', 'Goods and Services Tax', '#10B981', '🧾', 1],
    ['cat_02', 'Income Tax', 'IT', 'Income Tax compliances', '#3B82F6', '💰', 2],
    ['cat_03', 'TDS', 'TDS', 'Tax Deducted at Source', '#8B5CF6', '📊', 3],
    ['cat_04', 'ROC / MCA', 'MCA', 'Ministry of Corporate Affairs filings', '#F59E0B', '🏛️', 4],
    ['cat_05', 'PF', 'PF', 'Provident Fund', '#EF4444', '👥', 5],
    ['cat_06', 'ESI', 'ESI', 'Employee State Insurance', '#EC4899', '🏥', 6],
    ['cat_07', 'Professional Tax', 'PT', 'Professional Tax', '#14B8A6', '📋', 7],
    ['cat_08', 'Labour Compliance', 'LABOUR', 'Labour law compliances', '#F97316', '⚖️', 8],
    ['cat_09', 'Payroll', 'PAYROLL', 'Payroll processing', '#6366F1', '💳', 9],
    ['cat_10', 'Accounting', 'ACCT', 'Accounting compliances', '#0EA5E9', '📒', 10],
    ['cat_11', 'Secretarial', 'SECY', 'Secretarial compliance', '#A855F7', '📝', 11],
    ['cat_12', 'Annual Filings', 'ANNUAL', 'Annual filing requirements', '#D946EF', '📅', 12],
    ['cat_13', 'Board / Governance', 'BOARD', 'Board meetings and governance', '#0891B2', '🏢', 13],
    ['cat_14', 'Licenses & Renewals', 'LICENSE', 'Licenses and renewals', '#059669', '🪪', 14],
    ['cat_15', 'Internal MIS', 'MIS', 'Internal MIS requirements', '#7C3AED', '📈', 15],
    ['cat_16', 'Other Statutory', 'OTHER', 'Other statutory compliances', '#64748B', '📌', 16],
  ];
  const catStmt = db.prepare("INSERT INTO compliance_categories (id, name, code, description, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
  categories.forEach(c => catStmt.run(...c));

  // Compliances (50+ items)
  const compliancesData = [
    // GST
    ['comp_01', 'cat_01', 'GSTR-1', 'GSTR1', 'Monthly return of outward supplies', 'CBIC', 'monthly', 11, 'medium', 'dept_02'],
    ['comp_02', 'cat_01', 'GSTR-3B', 'GSTR3B', 'Monthly summary return and tax payment', 'CBIC', 'monthly', 20, 'high', 'dept_02'],
    ['comp_03', 'cat_01', 'GSTR-9', 'GSTR9', 'Annual GST return', 'CBIC', 'annual', 31, 'high', 'dept_02'],
    ['comp_04', 'cat_01', 'GSTR-9C', 'GSTR9C', 'GST reconciliation statement', 'CBIC', 'annual', 31, 'medium', 'dept_02'],
    ['comp_05', 'cat_01', 'ITC Reconciliation', 'ITC_RECON', 'Input Tax Credit reconciliation', 'CBIC', 'monthly', 25, 'medium', 'dept_02'],
    ['comp_06', 'cat_01', 'GST Payment', 'GST_PAY', 'GST tax payment challan', 'CBIC', 'monthly', 20, 'high', 'dept_02'],
    // TDS
    ['comp_07', 'cat_03', 'TDS Return - 24Q', 'TDS24Q', 'Quarterly TDS return for salaries', 'Income Tax Dept', 'quarterly', 31, 'high', 'dept_02'],
    ['comp_08', 'cat_03', 'TDS Return - 26Q', 'TDS26Q', 'Quarterly TDS return for non-salary', 'Income Tax Dept', 'quarterly', 31, 'high', 'dept_02'],
    ['comp_09', 'cat_03', 'TDS Return - 27Q', 'TDS27Q', 'Quarterly TDS return for NRI payments', 'Income Tax Dept', 'quarterly', 31, 'medium', 'dept_02'],
    ['comp_10', 'cat_03', 'TDS Certificate - 16A', 'TDS16A', 'Issue TDS certificates to deductees', 'Income Tax Dept', 'quarterly', 15, 'medium', 'dept_02'],
    ['comp_11', 'cat_03', 'Form 16', 'FORM16', 'Annual TDS certificate for employees', 'Income Tax Dept', 'annual', 15, 'high', 'dept_03'],
    ['comp_12', 'cat_03', 'TDS Payment', 'TDS_PAY', 'Monthly TDS payment challan', 'Income Tax Dept', 'monthly', 7, 'high', 'dept_02'],
    // Income Tax
    ['comp_13', 'cat_02', 'Advance Tax - Q1', 'ADV_Q1', 'First installment of advance tax', 'Income Tax Dept', 'annual', 15, 'high', 'dept_02'],
    ['comp_14', 'cat_02', 'Advance Tax - Q2', 'ADV_Q2', 'Second installment of advance tax', 'Income Tax Dept', 'annual', 15, 'high', 'dept_02'],
    ['comp_15', 'cat_02', 'Advance Tax - Q3', 'ADV_Q3', 'Third installment of advance tax', 'Income Tax Dept', 'annual', 15, 'high', 'dept_02'],
    ['comp_16', 'cat_02', 'Advance Tax - Q4', 'ADV_Q4', 'Fourth installment of advance tax', 'Income Tax Dept', 'annual', 15, 'high', 'dept_02'],
    ['comp_17', 'cat_02', 'Income Tax Return (ITR)', 'ITR', 'Annual Income Tax Return filing', 'Income Tax Dept', 'annual', 31, 'high', 'dept_02'],
    ['comp_18', 'cat_02', 'Tax Audit Report', 'TAX_AUDIT', 'Tax audit under section 44AB', 'Income Tax Dept', 'annual', 30, 'high', 'dept_02'],
    // MCA / ROC
    ['comp_19', 'cat_04', 'AOC-4 (Financial Statements)', 'AOC4', 'Filing of financial statements', 'MCA', 'annual', 30, 'high', 'dept_05'],
    ['comp_20', 'cat_04', 'MGT-7 (Annual Return)', 'MGT7', 'Filing of annual return', 'MCA', 'annual', 60, 'high', 'dept_05'],
    ['comp_21', 'cat_04', 'ADT-1 (Auditor Appointment)', 'ADT1', 'Appointment of auditor', 'MCA', 'annual', 15, 'medium', 'dept_05'],
    ['comp_22', 'cat_04', 'DIR-3 KYC', 'DIR3KYC', 'Director KYC annual filing', 'MCA', 'annual', 30, 'medium', 'dept_05'],
    ['comp_23', 'cat_04', 'DPT-3', 'DPT3', 'Return of deposits', 'MCA', 'annual', 30, 'medium', 'dept_05'],
    ['comp_24', 'cat_04', 'MSME-1', 'MSME1', 'MSME outstanding payment report', 'MCA', 'half_yearly', 30, 'medium', 'dept_05'],
    // PF
    ['comp_25', 'cat_05', 'PF Monthly Return', 'PF_MON', 'Monthly PF return filing', 'EPFO', 'monthly', 15, 'high', 'dept_03'],
    ['comp_26', 'cat_05', 'PF Payment', 'PF_PAY', 'Monthly PF contribution payment', 'EPFO', 'monthly', 15, 'high', 'dept_03'],
    ['comp_27', 'cat_05', 'PF Annual Return', 'PF_ANN', 'Annual PF return', 'EPFO', 'annual', 25, 'medium', 'dept_03'],
    // ESI
    ['comp_28', 'cat_06', 'ESI Monthly Return', 'ESI_MON', 'Monthly ESI contribution filing', 'ESIC', 'monthly', 15, 'high', 'dept_03'],
    ['comp_29', 'cat_06', 'ESI Payment', 'ESI_PAY', 'Monthly ESI payment', 'ESIC', 'monthly', 15, 'high', 'dept_03'],
    ['comp_30', 'cat_06', 'ESI Half-Yearly Return', 'ESI_HY', 'Half-yearly ESI return', 'ESIC', 'half_yearly', 12, 'medium', 'dept_03'],
    // Professional Tax
    ['comp_31', 'cat_07', 'PT Monthly Payment', 'PT_MON', 'Monthly professional tax payment', 'State Govt', 'monthly', 15, 'medium', 'dept_03'],
    ['comp_32', 'cat_07', 'PT Annual Return', 'PT_ANN', 'Annual professional tax return', 'State Govt', 'annual', 31, 'medium', 'dept_03'],
    // Payroll
    ['comp_33', 'cat_09', 'Payroll Processing', 'PAYROLL_PROC', 'Monthly payroll processing and disbursement', 'Internal', 'monthly', 28, 'high', 'dept_03'],
    ['comp_34', 'cat_09', 'Payroll MIS', 'PAYROLL_MIS', 'Monthly payroll MIS report', 'Internal', 'monthly', 5, 'medium', 'dept_03'],
    // Board
    ['comp_35', 'cat_13', 'Board Meeting', 'BOARD_MTG', 'Quarterly board meeting', 'MCA', 'quarterly', 0, 'high', 'dept_05'],
    ['comp_36', 'cat_13', 'AGM', 'AGM', 'Annual General Meeting', 'MCA', 'annual', 30, 'high', 'dept_05'],
    // Secretarial
    ['comp_37', 'cat_11', 'Statutory Registers Update', 'STAT_REG', 'Update statutory registers', 'MCA', 'quarterly', 30, 'medium', 'dept_05'],
    ['comp_38', 'cat_11', 'Minutes Filing', 'MIN_FILE', 'Board meeting minutes filing', 'MCA', 'quarterly', 30, 'medium', 'dept_05'],
    // Labour
    ['comp_39', 'cat_08', 'Shop & Establishment Renewal', 'SHOP_RENEW', 'Annual renewal of shop license', 'State Govt', 'annual', 31, 'medium', 'dept_04'],
    ['comp_40', 'cat_08', 'Contract Labour Return', 'CONTRACT_LAB', 'Annual contract labour returns', 'State Govt', 'annual', 31, 'low', 'dept_04'],
    // Accounting
    ['comp_41', 'cat_10', 'Monthly Book Closing', 'BOOK_CLOSE', 'Monthly finalization of accounts', 'Internal', 'monthly', 10, 'high', 'dept_06'],
    ['comp_42', 'cat_10', 'Bank Reconciliation', 'BANK_RECON', 'Monthly bank reconciliation', 'Internal', 'monthly', 10, 'medium', 'dept_06'],
    // Licenses
    ['comp_43', 'cat_14', 'Trade License Renewal', 'TRADE_LIC', 'Annual trade license renewal', 'Municipal Corp', 'annual', 31, 'medium', 'dept_04'],
    ['comp_44', 'cat_14', 'FSSAI Renewal', 'FSSAI', 'Food license renewal', 'FSSAI', 'annual', 30, 'medium', 'dept_04'],
    // Internal MIS
    ['comp_45', 'cat_15', 'Monthly MIS Report', 'MONTHLY_MIS', 'Monthly management information system', 'Internal', 'monthly', 7, 'medium', 'dept_01'],
    ['comp_46', 'cat_15', 'Cash Flow Statement', 'CASH_FLOW', 'Monthly cash flow statement', 'Internal', 'monthly', 10, 'medium', 'dept_01'],
    // Annual
    ['comp_47', 'cat_12', 'Annual Financial Statements', 'ANN_FIN', 'Preparation of annual financial statements', 'MCA', 'annual', 30, 'high', 'dept_06'],
    ['comp_48', 'cat_12', 'Statutory Audit', 'STAT_AUDIT', 'Annual statutory audit', 'MCA', 'annual', 30, 'high', 'dept_06'],
    // Other
    ['comp_49', 'cat_16', 'LUT Filing', 'LUT', 'Letter of Undertaking for exports', 'CBIC', 'annual', 31, 'medium', 'dept_02'],
    ['comp_50', 'cat_16', 'Equalisation Levy', 'EQ_LEVY', 'Equalisation levy return', 'Income Tax Dept', 'annual', 30, 'low', 'dept_02'],
  ];
  const compStmt = db.prepare("INSERT INTO compliances (id, category_id, name, code, description, authority, frequency, due_day, priority, default_department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  compliancesData.forEach(c => compStmt.run(...c));

  // Compliance Rules (applicability)
  const rulesData = [
    ['rule_01', 'comp_01', 'et_01', null, 'registration', 'gstin', 'exists', null],
    ['rule_02', 'comp_02', 'et_01', null, 'registration', 'gstin', 'exists', null],
    ['rule_03', 'comp_03', 'et_01', null, 'registration', 'gstin', 'exists', null],
    ['rule_04', 'comp_07', 'et_01', null, 'registration', 'tan', 'exists', null],
    ['rule_05', 'comp_08', 'et_01', null, 'registration', 'tan', 'exists', null],
    ['rule_06', 'comp_17', 'et_01', null, 'entity', 'entity_type', 'equals', 'PRIVATE_LIMITED'],
    ['rule_07', 'comp_19', 'et_01', null, 'entity', 'entity_type', 'equals', 'PRIVATE_LIMITED'],
    ['rule_08', 'comp_20', 'et_01', null, 'entity', 'entity_type', 'equals', 'PRIVATE_LIMITED'],
    ['rule_09', 'comp_25', null, null, 'numeric', 'employee_count', 'gte', '20'],
    ['rule_10', 'comp_28', null, null, 'numeric', 'employee_count', 'gte', '10'],
    ['rule_11', 'comp_01', 'et_03', null, 'registration', 'gstin', 'exists', null],
    ['rule_12', 'comp_02', 'et_03', null, 'registration', 'gstin', 'exists', null],
    ['rule_13', 'comp_01', 'et_05', null, 'registration', 'gstin', 'exists', null],
    ['rule_14', 'comp_02', 'et_05', null, 'registration', 'gstin', 'exists', null],
    ['rule_15', 'comp_33', null, null, 'always', null, null, null],
    ['rule_16', 'comp_41', null, null, 'always', null, null, null],
    ['rule_17', 'comp_42', null, null, 'always', null, null, null],
    ['rule_18', 'comp_45', null, null, 'always', null, null, null],
  ];
  const ruleStmt = db.prepare("INSERT INTO compliance_rules (id, compliance_id, entity_type_id, state, condition_type, condition_field, condition_operator, condition_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  rulesData.forEach(r => ruleStmt.run(...r));

  // MIS Templates
  const misTemplates = [
    ['comp_01', 'filing_period', 'Filing Period', 'text', 1, 1],
    ['comp_01', 'filing_date', 'Filing Date', 'date', 1, 2],
    ['comp_01', 'arn_number', 'ARN Number', 'text', 0, 3],
    ['comp_01', 'taxable_value', 'Taxable Value', 'number', 0, 4],
    ['comp_01', 'tax_amount', 'Tax Amount', 'number', 0, 5],
    ['comp_02', 'filing_period', 'Filing Period', 'text', 1, 1],
    ['comp_02', 'filing_date', 'Filing Date', 'date', 1, 2],
    ['comp_02', 'arn_number', 'ARN Number', 'text', 0, 3],
    ['comp_02', 'igst', 'IGST Amount', 'number', 0, 4],
    ['comp_02', 'cgst', 'CGST Amount', 'number', 0, 5],
    ['comp_02', 'sgst', 'SGST Amount', 'number', 0, 6],
    ['comp_02', 'total_tax', 'Total Tax Paid', 'number', 1, 7],
    ['comp_02', 'challan_number', 'Challan Number', 'text', 0, 8],
    ['comp_02', 'payment_date', 'Payment Date', 'date', 0, 9],
    ['comp_07', 'quarter', 'Quarter', 'text', 1, 1],
    ['comp_07', 'filing_date', 'Filing Date', 'date', 1, 2],
    ['comp_07', 'token_number', 'Token Number', 'text', 0, 3],
    ['comp_07', 'total_tds', 'Total TDS Amount', 'number', 1, 4],
    ['comp_07', 'challan_number', 'Challan Number', 'text', 0, 5],
    ['comp_12', 'payment_date', 'Payment Date', 'date', 1, 1],
    ['comp_12', 'challan_number', 'Challan Number', 'text', 1, 2],
    ['comp_12', 'bsr_code', 'BSR Code', 'text', 0, 3],
    ['comp_12', 'tds_amount', 'TDS Amount', 'number', 1, 4],
    ['comp_25', 'month', 'Month', 'text', 1, 1],
    ['comp_25', 'employee_contribution', 'Employee Contribution', 'number', 1, 2],
    ['comp_25', 'employer_contribution', 'Employer Contribution', 'number', 1, 3],
    ['comp_25', 'total_amount', 'Total Amount', 'number', 1, 4],
    ['comp_25', 'challan_number', 'TRRN Number', 'text', 0, 5],
    ['comp_25', 'payment_date', 'Payment Date', 'date', 0, 6],
  ];
  const misStmt = db.prepare("INSERT INTO mis_templates (compliance_id, field_name, field_label, field_type, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
  misTemplates.forEach(m => misStmt.run(...m));

  // Initial System Audit Log
  const auditStmt = db.prepare("INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  auditStmt.run(orgId, 'user_01', 'Dhyan', 'SYSTEM_INITIALIZED', 'system', 'org_001', 'ComplianceOS Platform Initialized', '{"admin":"Dhyan","role":"Super Admin"}');

  // Default Reminder Rules (30, 15, 7, 3, 1, 0 days before)
  const remStmt = db.prepare("INSERT INTO reminder_rules (days_before, channel, is_active) VALUES (?, 'both', 1)");
  [30, 15, 7, 3, 1, 0].forEach(d => remStmt.run(d));

  // System Settings
  const settStmt = db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)");
  settStmt.run('org_name', 'Enterprise Compliance Group');
  settStmt.run('financial_year_start', '4');
  settStmt.run('date_format', 'DD MMM YYYY');
  settStmt.run('timezone', 'Asia/Kolkata');
  settStmt.run('email_enabled', 'false');
  settStmt.run('smtp_host', '');
  settStmt.run('smtp_port', '587');

  // Build search index for statutory compliances library
  const searchStmt = db.prepare("INSERT INTO search_index (entity_type, entity_id, title, subtitle, content, firm_name) VALUES (?, ?, ?, ?, ?, ?)");
  compliancesData.forEach(c => searchStmt.run('compliance', c[0], c[2], c[4], `${c[2]} ${c[3]} ${c[4]} ${c[5]}`, ''));
}

export default getDb;
