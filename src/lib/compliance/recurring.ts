import getDb from '@/lib/db';

export interface GenerateCalendarOptions {
  firm_id: string;
  financial_year?: string; // e.g. '2026-2027'
  compliances?: {
    compliance_id: string;
    assignee_id?: string;
    department_id?: string;
    frequency?: string;
    override_due_day?: number | string;
  }[];
  created_by?: string;
}

/**
 * Generates all statutory compliance tasks for a firm for a full financial year
 */
export function generateFirmComplianceCalendar(options: GenerateCalendarOptions) {
  const db = getDb();
  const fy = options.financial_year || '2026-2027';
  const [startYearStr] = fy.split('-');
  const startYear = parseInt(startYearStr) || 2026;
  const endYear = startYear + 1;

  // Find firm
  const firm = db.prepare("SELECT * FROM firms WHERE id = ?").get(options.firm_id) as any;
  if (!firm) throw new Error('Firm not found');

  // Determine list of compliances to generate
  let complianceConfigs = options.compliances;
  if (!complianceConfigs || complianceConfigs.length === 0) {
    const firmComps = db.prepare(`
      SELECT fc.compliance_id,
             COALESCE(fc.override_frequency, c.frequency) as frequency,
             fc.override_due_day,
             COALESCE(fc.default_assignee_id, fc.override_assignee_id, 'user_01') as assignee_id,
             COALESCE(fc.default_department_id, fc.override_department_id) as department_id
      FROM firm_compliances fc
      JOIN compliances c ON fc.compliance_id = c.id
      WHERE fc.firm_id = ? AND (fc.status = 'active' OR fc.enabled = 1)
    `).all(options.firm_id) as any[];

    complianceConfigs = firmComps;
  }

  if (!complianceConfigs || complianceConfigs.length === 0) {
    return { createdCount: 0, message: 'No applicable compliances found' };
  }

  const insertTask = db.prepare(`
    INSERT INTO compliance_tasks (
      id, firm_id, compliance_id, period, due_date, status, priority,
      assignee_id, reviewer_id, department_id, financial_year, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const auditLog = db.prepare(`
    INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
    VALUES (?, ?, ?, 'CALENDAR_TASKS_GENERATED', 'firm', ?, ?, ?)
  `);

  let createdCount = 0;
  const orgId = firm.organization_id || 'org_001';
  const creatorId = options.created_by || 'system';

  // Default reviewer (Super Admin Raghu G R)
  const defaultReviewer = db.prepare("SELECT id FROM users WHERE role_id = 'role_01' OR role_id = 'role_03' LIMIT 1").get() as any;
  const reviewerId = defaultReviewer?.id || 'user_01';

  // Month mapping for Indian FY (April=Month 4 to March=Month 3)
  const fyMonths = [
    { name: 'Apr', monthNum: 4, year: startYear },
    { name: 'May', monthNum: 5, year: startYear },
    { name: 'Jun', monthNum: 6, year: startYear },
    { name: 'Jul', monthNum: 7, year: startYear },
    { name: 'Aug', monthNum: 8, year: startYear },
    { name: 'Sep', monthNum: 9, year: startYear },
    { name: 'Oct', monthNum: 10, year: startYear },
    { name: 'Nov', monthNum: 11, year: startYear },
    { name: 'Dec', monthNum: 12, year: startYear },
    { name: 'Jan', monthNum: 1, year: endYear },
    { name: 'Feb', monthNum: 2, year: endYear },
    { name: 'Mar', monthNum: 3, year: endYear },
  ];

  const quarters = [
    { name: 'Q1 (Apr-Jun)', dueMonth: 7, dueYear: startYear, period: `Q1 ${startYear}` },
    { name: 'Q2 (Jul-Sep)', dueMonth: 10, dueYear: startYear, period: `Q2 ${startYear}` },
    { name: 'Q3 (Oct-Dec)', dueMonth: 1, dueYear: endYear, period: `Q3 ${startYear}` },
    { name: 'Q4 (Jan-Mar)', dueMonth: 4, dueYear: endYear, period: `Q4 ${endYear}` },
  ];

  const halfYears = [
    { name: 'H1 (Apr-Sep)', dueMonth: 10, dueYear: startYear, period: `H1 ${startYear}` },
    { name: 'H2 (Oct-Mar)', dueMonth: 4, dueYear: endYear, period: `H2 ${endYear}` },
  ];

  for (const cfg of complianceConfigs) {
    const comp = db.prepare("SELECT * FROM compliances WHERE id = ?").get(cfg.compliance_id) as any;
    if (!comp) continue;

    const freq = (cfg.frequency || comp.frequency || 'Monthly').toLowerCase();
    const code = (comp.code || '').toUpperCase();
    const priority = comp.priority || 'medium';
    const deptId = cfg.department_id || comp.default_department_id || 'dept_01';
    const assigneeId = cfg.assignee_id || null;
    const customDueDay = cfg.override_due_day ? Number(cfg.override_due_day) : null;

    if (freq === 'monthly') {
      for (const m of fyMonths) {
        const periodName = `${m.name} ${m.year}`;
        let dueDay = customDueDay || 20;
        if (!customDueDay) {
          if (code.includes('GSTR-1') || code.includes('GSTR1')) dueDay = 11;
          else if (code.includes('PF') || code.includes('ESI')) dueDay = 15;
          else if (code.includes('GSTR-3B') || code.includes('3B')) dueDay = 20;
        }

        // Next month calculation
        let dueMonth = m.monthNum + 1;
        let dueYear = m.year;
        if (dueMonth > 12) {
          dueMonth = 1;
          dueYear += 1;
        }

        const formattedMonth = dueMonth.toString().padStart(2, '0');
        const formattedDay = dueDay.toString().padStart(2, '0');
        const dueDate = `${dueYear}-${formattedMonth}-${formattedDay}`;

        // Check if task already exists
        const exists = db.prepare("SELECT id FROM compliance_tasks WHERE firm_id = ? AND compliance_id = ? AND period = ?").get(firm.id, comp.id, periodName);
        if (!exists) {
          const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
          insertTask.run(taskId, firm.id, comp.id, periodName, dueDate, 'pending', priority, assigneeId, reviewerId, deptId, fy, creatorId);
          createdCount++;
        }
      }
    } else if (freq === 'quarterly') {
      for (const q of quarters) {
        let dueDay = customDueDay || 15;
        if (!customDueDay) {
          if (code.includes('24Q') || code.includes('26Q') || code.includes('27Q')) dueDay = 31;
          else if (code.includes('ADV_TAX')) dueDay = 15;
        }

        const formattedMonth = q.dueMonth.toString().padStart(2, '0');
        const formattedDay = dueDay.toString().padStart(2, '0');
        const dueDate = `${q.dueYear}-${formattedMonth}-${formattedDay}`;

        const exists = db.prepare("SELECT id FROM compliance_tasks WHERE firm_id = ? AND compliance_id = ? AND period = ?").get(firm.id, comp.id, q.period);
        if (!exists) {
          const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
          insertTask.run(taskId, firm.id, comp.id, q.period, dueDate, 'pending', priority, assigneeId, reviewerId, deptId, fy, creatorId);
          createdCount++;
        }
      }
    } else if (freq === 'half_yearly') {
      for (const h of halfYears) {
        const dueDay = customDueDay || 30;
        const formattedMonth = h.dueMonth.toString().padStart(2, '0');
        const formattedDay = dueDay.toString().padStart(2, '0');
        const dueDate = `${h.dueYear}-${formattedMonth}-${formattedDay}`;

        const exists = db.prepare("SELECT id FROM compliance_tasks WHERE firm_id = ? AND compliance_id = ? AND period = ?").get(firm.id, comp.id, h.period);
        if (!exists) {
          const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
          insertTask.run(taskId, firm.id, comp.id, h.period, dueDate, 'pending', priority, assigneeId, reviewerId, deptId, fy, creatorId);
          createdCount++;
        }
      }
    } else if (freq === 'annual' || freq === 'custom') {
      let dueDate = `${endYear}-09-30`;
      if (code.includes('AOC-4')) dueDate = `${endYear}-10-29`;
      else if (code.includes('MGT-7')) dueDate = `${endYear}-11-28`;
      else if (code.includes('DIR-3')) dueDate = `${endYear}-09-30`;
      else if (code.includes('GSTR-9')) dueDate = `${endYear}-12-31`;
      else if (code.includes('ITR')) dueDate = `${endYear}-10-31`;

      if (customDueDay) {
        dueDate = `${endYear}-09-${customDueDay.toString().padStart(2, '0')}`;
      }

      const periodName = `FY ${fy}`;
      const exists = db.prepare("SELECT id FROM compliance_tasks WHERE firm_id = ? AND compliance_id = ? AND period = ?").get(firm.id, comp.id, periodName);
      if (!exists) {
        const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        insertTask.run(taskId, firm.id, comp.id, periodName, dueDate, 'pending', priority, assigneeId, reviewerId, deptId, fy, creatorId);
        createdCount++;
      }
    }
  }

  auditLog.run(orgId, creatorId, 'Admin User', firm.id, firm.display_name, JSON.stringify({ fy, tasksGenerated: createdCount }));

  return { createdCount, message: `Successfully generated ${createdCount} compliance calendar tasks for ${firm.display_name} (FY ${fy})` };
}
