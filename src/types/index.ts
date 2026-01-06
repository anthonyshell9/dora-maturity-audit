export type OrganizationType =
  | 'MICROENTERPRISE'
  | 'DATA_REPORTING_SERVICE_PROVIDER'
  | 'CENTRAL_SECURITIES_DEPOSITORY'
  | 'CENTRAL_COUNTERPARTY'
  | 'PAYMENT_INSTITUTION_EXEMPTED'
  | 'INSTITUTION_EXEMPTED_2013_36'
  | 'ELECTRONIC_MONEY_INSTITUTION_EXEMPTED'
  | 'SMALL_OCCUPATIONAL_RETIREMENT'
  | 'SMALL_INTERCONNECTED_INVESTMENT'
  | 'SIGNIFICANT_CREDIT_INSTITUTION'
  | 'STANDARD';

export type UserRole = 'ADMIN' | 'AUDITOR' | 'VIEWER';

export type AuditStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export type AnswerType = 'YES' | 'NO' | 'NA' | 'NO_ANSWER';

export type ReportType = 'PDF' | 'EXCEL' | 'CSV';

export interface ApplicabilityCriteria {
  microenterprise: boolean;
  dataReportingServiceProvider: boolean;
  centralSecuritiesDepository: boolean;
  centralCounterparty: boolean;
  paymentInstitutionExempted: boolean;
  institutionExempted201336: boolean;
  electronicMoneyInstitutionExempted: boolean;
  smallOccupationalRetirement: boolean;
  smallInterconnectedInvestment: boolean;
  significantCreditInstitution: boolean;
}

export interface ChapterSummary {
  chapter: number;
  title: string;
  totalQuestions: number;
  yesCount: number;
  noCount: number;
  naCount: number;
  noAnswerCount: number;
  compliancePercentage: number;
}

export interface ArticleSummary {
  articleNumber: number;
  title: string;
  yesCount: number;
  noCount: number;
  naCount: number;
  noAnswerCount: number;
}

export interface AuditProgress {
  totalQuestions: number;
  answeredQuestions: number;
  progressPercentage: number;
  chapterProgress: {
    chapter: number;
    total: number;
    answered: number;
  }[];
}

export interface QuestionWithResponse {
  id: string;
  ref: string;
  text: string;
  articleNumber: number;
  articleTitle: string;
  chapter: number;
  response?: {
    answer: AnswerType;
    notes: string | null;
    evidences: {
      id: string;
      fileName: string;
      fileUrl: string;
    }[];
  };
}

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  MICROENTERPRISE: 'Microentreprise',
  DATA_REPORTING_SERVICE_PROVIDER: 'Prestataire de services de communication de donnees',
  CENTRAL_SECURITIES_DEPOSITORY: 'Depositaire central de titres',
  CENTRAL_COUNTERPARTY: 'Contrepartie centrale',
  PAYMENT_INSTITUTION_EXEMPTED: 'Etablissement de paiement exempte (Directive 2015/2366)',
  INSTITUTION_EXEMPTED_2013_36: 'Etablissement exempte (Directive 2013/36/EU)',
  ELECTRONIC_MONEY_INSTITUTION_EXEMPTED: 'Etablissement de monnaie electronique exempte (Directive 2009/110/EC)',
  SMALL_OCCUPATIONAL_RETIREMENT: 'Petit organisme de retraite professionnelle',
  SMALL_INTERCONNECTED_INVESTMENT: 'Petite entreprise d\'investissement interconnectee',
  SIGNIFICANT_CREDIT_INSTITUTION: 'Etablissement de credit significatif (Reglement 1024/2013)',
  STANDARD: 'Organisation standard',
};

export const CHAPTER_TITLES: Record<number, string> = {
  2: 'ICT Risk Management',
  3: 'ICT-Related Incident Management, Classification and Reporting',
  4: 'Digital Operational Resilience Testing',
  5: 'Managing ICT Third-Party Risk',
  6: 'Information-Sharing Arrangements',
};
