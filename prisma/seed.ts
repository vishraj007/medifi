// prisma/seed.ts

import { PrismaClient, Domain, Department } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const HEALTHCARE_TEMPLATE = `
<div class="header">
  <h1>MEDICAL CONSULTATION REPORT</h1>
  <p><strong>Department:</strong> {{department}}</p>
</div>

<div class="section">
  <h2>Patient Information</h2>
  <table>
    <tr>
      <td><strong>Name:</strong></td>
      <td>{{patientName}}</td>
      <td><strong>Date:</strong></td>
      <td>{{date}}</td>
    </tr>
  </table>
</div>

<div class="section">
  <h2>Chief Complaint</h2>
  <p>{{chiefComplaint}}</p>
</div>

<div class="section">
  <h2>Clinical Assessment & Plan</h2>
  {{{clinicalAssessment}}}
</div>
`

const FINANCE_TEMPLATE = `
<div class="header">
  <h1>FINANCIAL CONSULTATION REPORT</h1>
  <p><strong>Department:</strong> {{department}}</p>
</div>

<div class="section">
  <h2>Client Information</h2>
  <table>
    <tr>
      <td><strong>Name:</strong></td>
      <td>{{clientName}}</td>
      <td><strong>Date:</strong></td>
      <td>{{date}}</td>
    </tr>
  </table>
</div>

<div class="section">
  <h2>Financial Recommendations</h2>
  {{{recommendations}}}
</div>
`

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hospital.com' },
    update: {},
    create: {
      email: 'admin@hospital.com',
      name: 'Admin User',
      role: 'ADMIN',
      password: adminPassword,
      isActive: true
    }
  })
  console.log('✅ Admin user created:', admin.email)

  // Create doctor
  const doctorPassword = await bcrypt.hash('doctor123', 10)
  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@hospital.com' },
    update: {},
    create: {
      email: 'doctor@hospital.com',
      name: 'Dr. Rajesh Kumar',
      role: 'DOCTOR',
      department: 'GENERAL_MEDICINE',
      password: doctorPassword,
      isActive: true
    }
  })
  console.log('✅ Doctor created:', doctor.email)

  // Create finance agent
  const agentPassword = await bcrypt.hash('agent123', 10)
  const agent = await prisma.user.upsert({
    where: { email: 'agent@finance.com' },
    update: {},
    create: {
      email: 'agent@finance.com',
      name: 'Priya Sharma',
      role: 'FINANCE_AGENT',
      department: 'TAXATION',
      password: agentPassword,
      isActive: true
    }
  })
  console.log('✅ Finance agent created:', agent.email)

  // Create configs for healthcare departments
  const healthcareDepts: Department[] = [
    'GENERAL_MEDICINE',
    'CARDIOLOGY',
    'ORTHOPEDICS',
    'PEDIATRICS'
  ]

  for (const dept of healthcareDepts) {
    await prisma.config.upsert({
      where: {
        domain_department: {
          domain: 'HEALTHCARE',
          department: dept
        }
      },
      update: {},
      create: {
        domain: 'HEALTHCARE',
        department: dept,
        schema: {
          chiefComplaint: 'string',
          symptoms: 'array',
          duration: 'string',
          severity: 'number',
          vitals: {
            bp: 'string',
            pulse: 'number',
            temp: 'number'
          }
        },
        prompts: {
          system: 'You are a medical assistant helping with patient consultations.',
          extraction: 'Extract clinical information from the conversation.'
        },
        template: HEALTHCARE_TEMPLATE,
        isActive: true
      }
    })
    console.log(`✅ Config created: HEALTHCARE - ${dept}`)
  }

  // Create configs for finance departments
  const financeDepts: Department[] = [
    'TAXATION',
    'INVESTMENT',
    'INSURANCE',
    'LOANS'
  ]

  for (const dept of financeDepts) {
    await prisma.config.upsert({
      where: {
        domain_department: {
          domain: 'FINANCE',
          department: dept
        }
      },
      update: {},
      create: {
        domain: 'FINANCE',
        department: dept,
        schema: {
          employmentType: 'string',
          annualIncome: 'number',
          goals: 'array',
          riskAppetite: 'string'
        },
        prompts: {
          system: 'You are a financial advisor helping clients with their queries.',
          extraction: 'Extract financial information from the conversation.'
        },
        template: FINANCE_TEMPLATE,
        isActive: true
      }
    })
    console.log(`✅ Config created: FINANCE - ${dept}`)
  }

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })