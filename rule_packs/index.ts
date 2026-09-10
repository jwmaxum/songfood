// Generated starter Rule Registry.
// JSON files are the source-of-truth data; this TS layer provides typed loading/evaluation.

export type Jurisdiction = 'US' | 'CN' | 'JP' | 'EU' | 'UAE';
export type Severity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'REVIEW' | 'INFO';

export interface ComplianceRule {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown> & {
    type?: string;
    solution?: string;
  };
  evidence: {
    regulation: string;
    article?: string;
    source: string;
  };
}

export interface RulePack {
  jurisdiction: {
    country: Jurisdiction;
    authorities: string[];
  };
  rulePackVersion: string;
  effectiveDate?: string;
  rules: ComplianceRule[];
}

import us from './us.json';
import cn from './cn.json';
import jp from './jp.json';
import eu from './eu.json';
import uae from './uae.json';

export const RULE_PACKS: Record<Jurisdiction, RulePack> = {
  US: us as RulePack,
  CN: cn as RulePack,
  JP: jp as RulePack,
  EU: eu as RulePack,
  UAE: uae as RulePack,
};

export function getRulePack(jurisdiction: Jurisdiction): RulePack {
  return RULE_PACKS[jurisdiction];
}
