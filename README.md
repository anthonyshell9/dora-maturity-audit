# DORA Maturity Audit Tool

A comprehensive Digital Operational Resilience Act (DORA) compliance assessment tool for financial entities.

## Features

- **336 Assessment Questions** - Complete coverage of all DORA requirements across 5 chapters
- **Interactive Audit Wizard** - Step-by-step assessment with progress tracking
- **Evidence Management** - Upload and attach supporting documents to responses
- **Compliance Reports** - Generate PDF, Excel, and CSV reports
- **Organization Management** - Multi-organization support with different entity types
- **Applicability Criteria** - Automatic filtering based on organization type
- **Real-time Progress Tracking** - Monitor compliance progress per chapter

## DORA Chapters Covered

1. **Chapter 2: ICT Risk Management** (163 questions)
2. **Chapter 3: ICT-Related Incident Management** (28 questions)
3. **Chapter 4: Digital Operational Resilience Testing** (33 questions)
4. **Chapter 5: Managing ICT Third-Party Risk** (75 questions)
5. **Chapter 6: Information-Sharing Arrangements** (37 questions)

## Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Azure Flexible Server)
- **Storage**: Azure Blob Storage
- **Infrastructure**: Terraform, Azure
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Azure account (for production)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/dora-maturity-audit.git
cd dora-maturity-audit
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Infrastructure

```bash
cd infra
terraform init
terraform plan
terraform apply
```

## License

MIT License
