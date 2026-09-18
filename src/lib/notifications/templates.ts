import { formatISTDateTime, formatISTDate } from '@/lib/dateUtils';

export interface EmailTemplateData {
  eventType: string;
  userName?: string;
  taskName?: string;
  taskId?: string;
  firmName?: string;
  firmId?: string;
  complianceName?: string;
  complianceId?: string;
  departmentName?: string;
  priority?: string;
  dueDate?: string;
  originalDueDate?: string;
  status?: string;
  assignedBy?: string;
  reassignedFrom?: string;
  changedBy?: string;
  reviewerName?: string;
  comment?: string;
  rejectionReason?: string;
  changesRequested?: string;
  daysRemaining?: number;
  daysOverdue?: number;
  missedDate?: string;
  bulkTasks?: Array<{
    id: string;
    taskName: string;
    firmName: string;
    complianceName: string;
    priority: string;
    dueDate: string;
  }>;
  summaryStats?: {
    totalAssigned: number;
    pending: number;
    inProgress: number;
    awaitingReview: number;
    overdue: number;
    missed: number;
    completed: number;
    tasksDueToday?: Array<{ taskName: string; firmName: string; priority: string }>;
    overdueTasks?: Array<{ taskName: string; firmName: string; dueDate: string }>;
  };
  appBaseUrl?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Priority badge helper styling
 */
function getPriorityBadge(priority?: string): { bg: string; color: string; label: string } {
  const p = (priority || 'medium').toLowerCase();
  if (p === 'critical') return { bg: '#FEF2F2', color: '#B91C1C', label: 'CRITICAL' };
  if (p === 'high') return { bg: '#FFF7ED', color: '#C2410C', label: 'HIGH' };
  if (p === 'low') return { bg: '#F1F5F9', color: '#475569', label: 'LOW' };
  return { bg: '#EFF6FF', color: '#1D4ED8', label: 'MEDIUM' };
}

/**
 * Status badge helper styling
 */
function getStatusBadge(status?: string): { bg: string; color: string; label: string } {
  const s = (status || 'pending').toLowerCase();
  if (s === 'completed') return { bg: '#F0FDF4', color: '#15803D', label: 'Completed' };
  if (s === 'submitted') return { bg: '#FAF5FF', color: '#7E22CE', label: 'Awaiting Review' };
  if (s === 'overdue') return { bg: '#FEF2F2', color: '#DC2626', label: 'Overdue' };
  if (s === 'missed') return { bg: '#450A0A', color: '#FEE2E2', label: 'Missed' };
  if (s === 'in_progress') return { bg: '#EFF6FF', color: '#2563EB', label: 'In Progress' };
  return { bg: '#F8FAFC', color: '#64748B', label: s.replace('_', ' ').toUpperCase() };
}

/**
 * Master HTML Layout for all CompliCal Emails
 */
function wrapInMasterLayout(title: string, contentHtml: string, ctaButton?: { text: string; url: string }, appBaseUrl: string = 'http://localhost:3000'): string {
  const preferencesUrl = `${appBaseUrl}/notifications`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    a { color: #2563EB; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content-padding { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #F8FAFC; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <!-- Main Email Card -->
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #0F172A; padding: 22px 28px; border-bottom: 3px solid #2563EB;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #94A3B8; text-transform: uppercase;">
                      BALAJI GROUPS
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; margin-top: 2px;">
                      CompliCal
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(37, 99, 235, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 20px; font-size: 11px; font-weight: 600; color: #93C5FD; letter-spacing: 0.5px;">
                      COMPLIANCE OPERATING PLATFORM
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="content-padding" style="padding: 32px 28px;">
              ${contentHtml}

              ${ctaButton ? `
              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td align="center">
                    <a href="${ctaButton.url}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 700; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);">
                      ${ctaButton.text} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 22px 28px; border-top: 1px solid #E2E8F0; text-align: center;">
              <div style="font-size: 12px; font-weight: 700; color: #0F172A;">
                CompliCal &bull; Compliance Management Platform
              </div>
              <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
                Automated statutory operating intelligence powered for <strong>BALAJI GROUPS</strong>.
              </div>
              <div style="font-size: 11px; color: #94A3B8; margin-top: 12px;">
                This is a system-generated operational notification. Please do not reply directly to this email.
                <br>
                <a href="${preferencesUrl}" style="color: #2563EB; text-decoration: underline; margin-top: 4px; display: inline-block;">
                  Manage Notification Preferences
                </a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Standard details table component
 */
function renderDetailsCard(data: EmailTemplateData): string {
  const priorityBadge = getPriorityBadge(data.priority);
  const statusBadge = getStatusBadge(data.status);

  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-top: 20px; overflow: hidden;">
    ${data.taskName ? `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 600; color: #64748B; width: 140px;">Task / Filing</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; color: #0F172A;">${data.taskName}</td>
    </tr>` : ''}
    ${data.firmName ? `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 600; color: #64748B;">Firm / Entity</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 600; color: #1E293B;">${data.firmName}</td>
    </tr>` : ''}
    ${data.complianceName && data.complianceName !== data.taskName ? `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 600; color: #64748B;">Statutory Compliance</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #334155;">${data.complianceName}</td>
    </tr>` : ''}
    ${data.departmentName ? `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 600; color: #64748B;">Department</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #334155;">${data.departmentName}</td>
    </tr>` : ''}
    ${data.dueDate ? `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 600; color: #64748B;">Statutory Due Date</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; color: #0F172A;">${formatISTDate(data.dueDate)}</td>
    </tr>` : ''}
    ${data.priority ? `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 600; color: #64748B;">Priority</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: ${priorityBadge.bg}; color: ${priorityBadge.color};">
          ${priorityBadge.label}
        </span>
      </td>
    </tr>` : ''}
    ${data.status ? `
    <tr>
      <td style="padding: 10px 16px; font-size: 12px; font-weight: 600; color: #64748B;">Status</td>
      <td style="padding: 10px 16px; font-size: 13px;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: ${statusBadge.bg}; color: ${statusBadge.color};">
          ${statusBadge.label}
        </span>
      </td>
    </tr>` : ''}
  </table>`;
}

/**
 * Builds standard email templates based on Event Type
 */
export function buildEmailContent(eventType: string, data: EmailTemplateData): RenderedEmail {
  const baseUrl = data.appBaseUrl || process.env.APP_BASE_URL || 'http://localhost:3000';
  const taskUrl = data.taskId ? `${baseUrl}/tasks/${data.taskId}` : `${baseUrl}/tasks`;
  const name = data.userName || 'Team Member';
  const taskTitle = data.taskName || data.complianceName || 'Statutory Deliverable';

  switch (eventType) {
    case 'TASK_ASSIGNED': {
      const subject = `[CompliCal] New Task Assigned — ${taskTitle}`;
      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 600; color: #2563EB; text-transform: uppercase; letter-spacing: 0.5px;">
          Operational Task Assignment
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 16px;">
          New Task Assigned to You
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hello <strong>${name}</strong>,<br>
          You have been assigned as the lead executive responsible for executing the following compliance deliverable on behalf of <strong>${data.firmName || 'BALAJI GROUPS'}</strong>.
        </p>
        ${renderDetailsCard(data)}
        ${data.assignedBy ? `
        <div style="margin-top: 16px; font-size: 12px; color: #64748B;">
          <strong>Assigned By:</strong> ${data.assignedBy} &bull; <strong>Timestamp:</strong> ${formatISTDateTime(new Date().toISOString())}
        </div>` : ''}
        `,
        { text: 'View Task in CompliCal', url: taskUrl },
        baseUrl
      );
      const text = `Hello ${name},\n\nYou have been assigned a new compliance task: ${taskTitle}\nFirm: ${data.firmName || 'BALAJI GROUPS'}\nDue Date: ${data.dueDate ? formatISTDate(data.dueDate) : 'N/A'}\nPriority: ${data.priority || 'Medium'}\n\nView Task: ${taskUrl}\n\nCompliCal - BALAJI GROUPS`;
      return { subject, html, text };
    }

    case 'TASK_REASSIGNED': {
      const subject = `[CompliCal] Task Reassigned to You — ${taskTitle}`;
      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 600; color: #D97706; text-transform: uppercase; letter-spacing: 0.5px;">
          Workload Reassignment
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 16px;">
          Task Reassigned to You
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hello <strong>${name}</strong>,<br>
          Responsibility for the task <strong>${taskTitle}</strong> has been transferred to you${data.reassignedFrom ? ` from <strong>${data.reassignedFrom}</strong>` : ''}.
        </p>
        ${renderDetailsCard(data)}
        ${data.comment ? `
        <div style="margin-top: 16px; padding: 12px 16px; background-color: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 4px; font-size: 13px; color: #92400E;">
          <strong>Reassignment Note:</strong> ${data.comment}
        </div>` : ''}
        `,
        { text: 'View Task in CompliCal', url: taskUrl },
        baseUrl
      );
      const text = `Hello ${name},\n\nThe task ${taskTitle} has been reassigned to you.\nFirm: ${data.firmName || 'BALAJI GROUPS'}\nDue Date: ${data.dueDate ? formatISTDate(data.dueDate) : 'N/A'}\n${data.comment ? `Reason: ${data.comment}\n` : ''}\nView Task: ${taskUrl}`;
      return { subject, html, text };
    }

    case 'TASK_DUE_DATE_CHANGED':
    case 'COMPLIANCE_RESCHEDULED': {
      const isComp = eventType === 'COMPLIANCE_RESCHEDULED';
      const subject = isComp
        ? `[CompliCal] Compliance Due Date Rescheduled — ${taskTitle}`
        : `[CompliCal] Task Due Date Updated — ${taskTitle}`;
      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 600; color: #2563EB; text-transform: uppercase; letter-spacing: 0.5px;">
          Calendar Reschedule Notice
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 16px;">
          ${isComp ? 'Compliance Schedule Adjusted' : 'Task Due Date Updated'}
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hello <strong>${name}</strong>,<br>
          The statutory filing deadline for <strong>${taskTitle}</strong> (${data.firmName}) has been rescheduled.
        </p>
        <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
          <div style="font-size: 12px; color: #1E40AF; font-weight: 600;">Previous Deadline:</div>
          <div style="font-size: 14px; color: #64748B; text-decoration: line-through; margin-bottom: 6px;">${data.originalDueDate ? formatISTDate(data.originalDueDate) : 'Previous Date'}</div>
          <div style="font-size: 12px; color: #1E40AF; font-weight: 600;">New Statutory Deadline:</div>
          <div style="font-size: 16px; font-weight: 800; color: #1D4ED8;">${data.dueDate ? formatISTDate(data.dueDate) : 'Updated Date'}</div>
        </div>
        ${data.comment ? `
        <div style="margin-top: 12px; font-size: 13px; color: #475569;">
          <strong>Adjustment Justification:</strong> ${data.comment}
        </div>` : ''}
        ${renderDetailsCard(data)}
        `,
        { text: 'Review Updated Schedule', url: taskUrl },
        baseUrl
      );
      const text = `Hello ${name},\n\nThe due date for ${taskTitle} has been updated to ${data.dueDate ? formatISTDate(data.dueDate) : 'N/A'}.\n${data.comment ? `Reason: ${data.comment}\n` : ''}\nView Task: ${taskUrl}`;
      return { subject, html, text };
    }

    case 'TASK_DUE_SOON': {
      const days = data.daysRemaining !== undefined ? data.daysRemaining : 3;
      const isToday = days === 0;
      const subject = isToday
        ? `[CompliCal] Action Required — Compliance Due Today — ${taskTitle}`
        : days === 1
        ? `[CompliCal] Action Required — Compliance Due Tomorrow — ${taskTitle}`
        : `[CompliCal] Reminder — Compliance Due in ${days} Days — ${taskTitle}`;

      const alertColor = isToday ? '#DC2626' : days <= 3 ? '#EA580C' : '#2563EB';

      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 600; color: ${alertColor}; text-transform: uppercase; letter-spacing: 0.5px;">
          ${isToday ? 'CRITICAL DEADLINE TODAY' : 'UPCOMING STATUTORY DEADLINE'}
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 16px;">
          ${isToday ? 'Statutory Filing Due Today' : `Filing Due in ${days} Day${days === 1 ? '' : 's'}`}
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hello <strong>${name}</strong>,<br>
          This is an automated statutory filing reminder. The compliance deliverable <strong>${taskTitle}</strong> for <strong>${data.firmName}</strong> is due on <strong>${data.dueDate ? formatISTDate(data.dueDate) : 'Scheduled Date'}</strong>.
        </p>
        ${renderDetailsCard(data)}
        <div style="margin-top: 16px; padding: 12px 16px; background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 6px; font-size: 12px; color: #475569;">
          &bull; Ensure supporting challans or documents are uploaded.<br>
          &bull; Submit for supervisory review ahead of the regulatory cutoff to avoid statutory penalties.
        </div>
        `,
        { text: isToday ? 'Complete Filing Now' : 'View Task Details', url: taskUrl },
        baseUrl
      );
      const text = `REMINDER: ${taskTitle} for ${data.firmName} is due on ${data.dueDate ? formatISTDate(data.dueDate) : 'N/A'} (${days === 0 ? 'TODAY' : `${days} days remaining`}).\nView: ${taskUrl}`;
      return { subject, html, text };
    }

    case 'TASK_OVERDUE': {
      const subject = `[CompliCal] ⚠️ Overdue Compliance — ${taskTitle}`;
      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 700; color: #DC2626; text-transform: uppercase; letter-spacing: 0.5px;">
          STATUTORY COMPLIANCE OVERDUE
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #991B1B; margin: 4px 0 16px;">
          Immediate Action Required: Deadline Passed
        </h2>
        <div style="background-color: #FEF2F2; border: 1px solid #F87171; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="font-size: 14px; line-height: 1.6; color: #991B1B; margin: 0;">
            <strong>Warning:</strong> The statutory filing deadline for <strong>${taskTitle}</strong> (${data.firmName}) was <strong>${data.dueDate ? formatISTDate(data.dueDate) : 'Past Deadline'}</strong> and is currently marked <strong>OVERDUE</strong>.
          </p>
        </div>
        ${renderDetailsCard(data)}
        <p style="font-size: 13px; color: #475569; margin: 16px 0 0;">
          Please finalize the deliverable and submit it for review immediately to prevent non-compliance notices or compounding penalties.
        </p>
        `,
        { text: 'Resolve Overdue Deliverable', url: taskUrl },
        baseUrl
      );
      const text = `OVERDUE NOTICE: ${taskTitle} for ${data.firmName} was due on ${data.dueDate ? formatISTDate(data.dueDate) : 'N/A'}.\nImmediate action required.\nView Task: ${taskUrl}`;
      return { subject, html, text };
    }

    case 'TASK_MISSED': {
      const subject = `[CompliCal] ✕ Missed Compliance — ${taskTitle}`;
      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 700; color: #7F1D1D; text-transform: uppercase; letter-spacing: 0.5px;">
          CRITICAL NON-COMPLIANCE NOTICE
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #7F1D1D; margin: 4px 0 16px;">
          Statutory Compliance Missed
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          The regulatory window for <strong>${taskTitle}</strong> (${data.firmName}) has lapsed without recorded filing.
        </p>
        ${renderDetailsCard(data)}
        <div style="margin-top: 16px; padding: 14px; background-color: #FFF1F2; border-left: 4px solid #E11D48; font-size: 13px; color: #881337;">
          <strong>Required Action:</strong> Initiate condonation / late filing procedure with supervisory oversight.
        </div>
        `,
        { text: 'Open Compliance Workspace', url: taskUrl },
        baseUrl
      );
      const text = `MISSED COMPLIANCE: ${taskTitle} for ${data.firmName} has lapsed.\nView Task: ${taskUrl}`;
      return { subject, html, text };
    }

    case 'TASK_SUBMITTED': {
      const subject = `[CompliCal] Task Awaiting Review — ${taskTitle}`;
      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 600; color: #7E22CE; text-transform: uppercase; letter-spacing: 0.5px;">
          Supervisory Audit & Review
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 16px;">
          Task Submitted for Review
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hello <strong>${name}</strong>,<br>
          The task <strong>${taskTitle}</strong> for <strong>${data.firmName}</strong> has been submitted by <strong>${data.assignedBy || 'Executive'}</strong> and is awaiting your review and sign-off.
        </p>
        ${renderDetailsCard(data)}
        `,
        { text: 'Review & Sign Off Task', url: taskUrl },
        baseUrl
      );
      const text = `Task Awaiting Review: ${taskTitle} for ${data.firmName} was submitted by ${data.assignedBy || 'Executive'}.\nReview: ${taskUrl}`;
      return { subject, html, text };
    }

    case 'TASK_APPROVED': {
      const subject = `[CompliCal] Task Completed — ${taskTitle}`;
      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 600; color: #15803D; text-transform: uppercase; letter-spacing: 0.5px;">
          Compliance Approved & Closed
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 16px;">
          Task Completed & Approved
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hello <strong>${name}</strong>,<br>
          Great news! The deliverable <strong>${taskTitle}</strong> for <strong>${data.firmName}</strong> has been reviewed, approved, and marked as <strong>COMPLETED</strong>.
        </p>
        ${renderDetailsCard(data)}
        ${data.reviewerName ? `
        <div style="margin-top: 14px; font-size: 12px; color: #64748B;">
          <strong>Approved By:</strong> ${data.reviewerName} &bull; <strong>Date:</strong> ${formatISTDateTime(new Date().toISOString())}
        </div>` : ''}
        `,
        { text: 'View Completed Task', url: taskUrl },
        baseUrl
      );
      const text = `Task Completed: ${taskTitle} for ${data.firmName} was approved and marked completed.\nView: ${taskUrl}`;
      return { subject, html, text };
    }

    case 'TASK_REJECTED':
    case 'TASK_CHANGES_REQUESTED': {
      const isRej = eventType === 'TASK_REJECTED';
      const subject = isRej
        ? `[CompliCal] Task Rejected — Action Required — ${taskTitle}`
        : `[CompliCal] Changes Requested — ${taskTitle}`;

      const reason = data.rejectionReason || data.changesRequested || data.comment || 'Additional documentation or corrections required.';

      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 700; color: #DC2626; text-transform: uppercase; letter-spacing: 0.5px;">
          ${isRej ? 'Task Rejected / Correction Required' : 'Modifications Requested'}
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 16px;">
          ${isRej ? 'Task Returned for Corrections' : 'Changes Requested by Reviewer'}
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hello <strong>${name}</strong>,<br>
          Your submission for <strong>${taskTitle}</strong> (${data.firmName}) was reviewed by <strong>${data.reviewerName || 'Supervisor'}</strong> and requires adjustments before it can be approved.
        </p>
        <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 14px 18px; border-radius: 4px; margin-bottom: 20px;">
          <div style="font-size: 12px; font-weight: 700; color: #991B1B; text-transform: uppercase;">Reviewer Feedback:</div>
          <div style="font-size: 14px; font-weight: 600; color: #7F1D1D; margin-top: 4px;">${reason}</div>
        </div>
        ${renderDetailsCard(data)}
        `,
        { text: 'Open Task & Make Changes', url: taskUrl },
        baseUrl
      );
      const text = `${isRej ? 'Task Rejected' : 'Changes Requested'}: ${taskTitle} for ${data.firmName}.\nReason: ${reason}\nView: ${taskUrl}`;
      return { subject, html, text };
    }

    case 'TASK_COMMENT_ADDED': {
      const subject = `[CompliCal] New Comment on Task — ${taskTitle}`;
      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 600; color: #2563EB; text-transform: uppercase; letter-spacing: 0.5px;">
          Discussion & Audit Note
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 16px;">
          New Comment on Task
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hello <strong>${name}</strong>,<br>
          <strong>${data.assignedBy || 'A team member'}</strong> added a comment to <strong>${taskTitle}</strong> (${data.firmName}):
        </p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #2563EB; border-radius: 6px; padding: 14px 18px; margin: 16px 0; font-size: 14px; color: #1E293B; font-style: italic;">
          "${data.comment || 'Added an attachment.'}"
        </div>
        ${renderDetailsCard(data)}
        `,
        { text: 'Join Discussion & View Task', url: taskUrl },
        baseUrl
      );
      const text = `New Comment on ${taskTitle}: "${data.comment || 'Attachment added'}"\nView: ${taskUrl}`;
      return { subject, html, text };
    }

    case 'BULK_ASSIGNMENT': {
      const count = data.bulkTasks?.length || 0;
      const subject = `[CompliCal] ${count} New Tasks Assigned to You`;
      const rowsHtml = (data.bulkTasks || []).map(t => {
        const badge = getPriorityBadge(t.priority);
        return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 600; color: #0F172A;">${t.taskName}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #475569;">${t.firmName}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #475569;">${t.complianceName}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: ${badge.bg}; color: ${badge.color};">
              ${badge.label}
            </span>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 700; color: #1E293B;">${formatISTDate(t.dueDate)}</td>
        </tr>`;
      }).join('');

      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 600; color: #2563EB; text-transform: uppercase; letter-spacing: 0.5px;">
          Consolidated Bulk Assignment
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 16px;">
          ${count} Compliance Tasks Assigned to You
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hello <strong>${name}</strong>,<br>
          An administrator has assigned <strong>${count} compliance tasks</strong> to your queue across BALAJI GROUPS entities.
        </p>
        <div style="overflow-x: auto; margin-top: 16px; border: 1px solid #E2E8F0; border-radius: 8px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <thead>
              <tr style="background-color: #F1F5F9; text-align: left;">
                <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Task</th>
                <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Firm</th>
                <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Compliance</th>
                <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Priority</th>
                <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
        `,
        { text: 'View My Tasks in CompliCal', url: `${baseUrl}/tasks` },
        baseUrl
      );
      const text = `Bulk Assignment: ${count} tasks have been assigned to you.\nView: ${baseUrl}/tasks`;
      return { subject, html, text };
    }

    case 'DAILY_SUMMARY': {
      const stats = data.summaryStats || {
        totalAssigned: 0, pending: 0, inProgress: 0, awaitingReview: 0, overdue: 0, missed: 0, completed: 0
      };
      const todayStr = formatISTDate(new Date().toISOString());
      const subject = `[CompliCal] Daily Compliance Summary — ${todayStr}`;

      const html = wrapInMasterLayout(
        subject,
        `
        <div style="font-size: 14px; font-weight: 600; color: #2563EB; text-transform: uppercase; letter-spacing: 0.5px;">
          Daily Operational Briefing
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 16px;">
          Your Daily Compliance Summary &bull; ${todayStr}
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Hello <strong>${name}</strong>,<br>
          Here is your daily snapshot of statutory filings and operational workloads across BALAJI GROUPS.
        </p>

        <!-- KPI Grid -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0;">
          <tr>
            <td width="33%" style="padding: 8px;">
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Total Active</div>
                <div style="font-size: 22px; font-weight: 800; color: #0F172A; margin-top: 4px;">${stats.totalAssigned}</div>
              </div>
            </td>
            <td width="33%" style="padding: 8px;">
              <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 14px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #1D4ED8; text-transform: uppercase;">In Progress</div>
                <div style="font-size: 22px; font-weight: 800; color: #1E40AF; margin-top: 4px;">${stats.inProgress + stats.pending}</div>
              </div>
            </td>
            <td width="33%" style="padding: 8px;">
              <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 14px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #B91C1C; text-transform: uppercase;">Overdue</div>
                <div style="font-size: 22px; font-weight: 800; color: #DC2626; margin-top: 4px;">${stats.overdue}</div>
              </div>
            </td>
          </tr>
        </table>
        `,
        { text: 'Open CompliCal Dashboard', url: `${baseUrl}/dashboard` },
        baseUrl
      );
      const text = `Daily Summary for ${name} (${todayStr}):\nActive: ${stats.totalAssigned}, In Progress: ${stats.inProgress + stats.pending}, Overdue: ${stats.overdue}\nView Dashboard: ${baseUrl}/dashboard`;
      return { subject, html, text };
    }

    default: {
      const subject = `[CompliCal] Compliance Notification — ${taskTitle}`;
      const html = wrapInMasterLayout(
        subject,
        `
        <h2 style="font-size: 18px; font-weight: 800; color: #0F172A;">Compliance Operating Alert</h2>
        <p style="font-size: 14px; color: #334155;">Hello ${name}, an event regarding <strong>${taskTitle}</strong> was recorded in CompliCal.</p>
        ${renderDetailsCard(data)}
        `,
        { text: 'Open CompliCal', url: taskUrl },
        baseUrl
      );
      const text = `Compliance Notification: ${taskTitle}\nView: ${taskUrl}`;
      return { subject, html, text };
    }
  }
}
