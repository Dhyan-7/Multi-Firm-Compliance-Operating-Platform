import getDb from '@/lib/db';

export interface FirmProfile {
  id?: string;
  name: string;
  entity_type_code: string; // pvt_ltd, llp, prop, pub_ltd, etc.
  has_gstin?: boolean;
  has_pan?: boolean;
  has_tan?: boolean;
  has_pf?: boolean;
  has_esi?: boolean;
  has_pt?: boolean;
  state?: string;
}

export interface ApplicableRule {
  compliance_id: string;
  compliance_name: string;
  compliance_code: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  frequency: string;
  authority: string;
  priority: string;
  mandatory: boolean;
  reason: string;
}

/**
 * Evaluates a firm profile against statutory compliance criteria
 * Returns list of automatically recommended compliances
 */
export function evaluateApplicability(profile: FirmProfile): ApplicableRule[] {
  const db = getDb();
  const allCompliances = db.prepare(`
    SELECT c.*, cc.name as category_name, cc.color as category_color, cc.icon as category_icon
    FROM compliances c
    LEFT JOIN compliance_categories cc ON c.category_id = cc.id
    WHERE c.status = 'active'
    ORDER BY c.priority DESC, c.name ASC
  `).all() as any[];

  const results: ApplicableRule[] = [];
  const entityCode = (profile.entity_type_code || '').toLowerCase();
  const isCompany = entityCode.includes('pvt') || entityCode.includes('pub') || entityCode === 'ltd';
  const isLLP = entityCode.includes('llp');

  for (const comp of allCompliances) {
    let applicable = false;
    const mandatory = true;
    let reason = '';
    const cat = (comp.category_name || '').toUpperCase();
    const code = (comp.code || '').toUpperCase();

    // GST Rules
    if (cat.includes('GST') || code.includes('GSTR') || code.includes('GST')) {
      if (profile.has_gstin) {
        applicable = true;
        reason = 'Firm possesses active GSTIN registration';
      }
    }

    // Income Tax Rules
    else if (cat.includes('INCOME TAX') || cat.includes('IT') || code.includes('ITR') || code.includes('ADV_TAX')) {
      applicable = true;
      reason = 'Mandatory statutory Income Tax obligation for operational entities';
    }

    // TDS Rules
    else if (cat.includes('TDS') || code.includes('TDS') || code.includes('24Q') || code.includes('26Q')) {
      if (profile.has_tan || isCompany || isLLP) {
        applicable = true;
        reason = profile.has_tan ? 'Firm possesses active TAN' : 'Standard statutory withholding requirements for commercial entities';
      }
    }

    // ROC / MCA Rules
    else if (cat.includes('ROC') || cat.includes('MCA') || code.includes('AOC') || code.includes('MGT') || code.includes('DIR') || code.includes('ADT')) {
      if (isCompany || isLLP) {
        applicable = true;
        reason = isCompany ? 'Statutory MCA filing requirement under Companies Act 2013' : 'Statutory MCA filing for Limited Liability Partnerships';
      }
    }

    // PF (Provident Fund) Rules
    else if (cat.includes('PF') || code.includes('PF')) {
      if (profile.has_pf || isCompany) {
        applicable = true;
        reason = profile.has_pf ? 'Registered for Provident Fund' : 'Statutory retirement fund provisions for incorporated entities';
      }
    }

    // ESI Rules
    else if (cat.includes('ESI') || code.includes('ESI')) {
      if (profile.has_esi) {
        applicable = true;
        reason = 'Statutory ESI registration and monthly return requirement';
      }
    }

    // Professional Tax
    else if (cat.includes('PROFESSIONAL TAX') || code.includes('PT')) {
      if (profile.has_pt || isCompany || isLLP) {
        applicable = true;
        reason = 'State Professional Tax employer deduction & statutory filing';
      }
    }

    // Accounting & Payroll
    else if (cat.includes('ACCOUNTING') || cat.includes('PAYROLL') || cat.includes('ANNUAL')) {
      applicable = true;
      reason = 'Core internal governance and annual statutory book closure';
    }

    // Secretarial / Board
    else if (cat.includes('SECRETARIAL') || cat.includes('BOARD') || code.includes('AGM') || code.includes('BM')) {
      if (isCompany || isLLP) {
        applicable = true;
        reason = 'Mandatory corporate secretarial records & meeting minutes under Companies Act';
      }
    }

    if (applicable) {
      results.push({
        compliance_id: comp.id,
        compliance_name: comp.name,
        compliance_code: comp.code,
        category_name: comp.category_name || 'General',
        category_color: comp.category_color || '#3B82F6',
        category_icon: comp.category_icon || '📋',
        frequency: comp.frequency,
        authority: comp.authority,
        priority: comp.priority,
        mandatory,
        reason,
      });
    }
  }

  return results;
}
