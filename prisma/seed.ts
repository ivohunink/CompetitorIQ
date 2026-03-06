import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@competitoriq.com" },
    update: {},
    create: {
      email: "admin@competitoriq.com",
      name: "Admin User",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  // Create editor user
  const editorPassword = await bcrypt.hash("editor123", 12);
  const editor = await prisma.user.upsert({
    where: { email: "editor@competitoriq.com" },
    update: {},
    create: {
      email: "editor@competitoriq.com",
      name: "PM Editor",
      passwordHash: editorPassword,
      role: "EDITOR",
    },
  });

  // Create viewer user
  const viewerPassword = await bcrypt.hash("viewer123", 12);
  await prisma.user.upsert({
    where: { email: "viewer@competitoriq.com" },
    update: {},
    create: {
      email: "viewer@competitoriq.com",
      name: "Marketing Viewer",
      passwordHash: viewerPassword,
      role: "VIEWER",
    },
  });

  // Create categories
  const categoryData = [
    { name: "Scheduling", description: "Auto-scheduling, shift management, and workforce planning" },
    { name: "Time & Attendance", description: "Clock-in/out, timesheets, and overtime tracking" },
    { name: "HR & Employee Management", description: "Employee profiles, onboarding, and performance" },
    { name: "Compliance & Labor Law", description: "Break rules, labor law compliance, and audit trails" },
    { name: "Communication", description: "Messaging, announcements, and availability management" },
    { name: "Reporting & Analytics", description: "Dashboards, labor cost reports, and data export" },
    { name: "Integrations", description: "Payroll, POS, ATS, and API connectivity" },
    { name: "Employee App (Mobile)", description: "Mobile schedule view, shift swap, and leave requests" },
    { name: "AI & Automation", description: "AI scheduling, demand forecasting, and smart alerts" },
    { name: "Onboarding & Setup", description: "Guided setup, CSV import, and template libraries" },
  ];

  const categories: Record<string, any> = {};
  for (let i = 0; i < categoryData.length; i++) {
    const cat = await prisma.category.upsert({
      where: { name: categoryData[i].name },
      update: {},
      create: { ...categoryData[i], sortOrder: i },
    });
    categories[cat.name] = cat;
  }

  // Create competitors
  const competitorData = [
    { name: "Deputy", websiteUrl: "https://www.deputy.com", marketSegment: "SMB Workforce Management", status: "ACTIVE" as const },
    { name: "When I Work", websiteUrl: "https://wheniwork.com", marketSegment: "Shift Scheduling", status: "ACTIVE" as const },
    { name: "Homebase", websiteUrl: "https://joinhomebase.com", marketSegment: "SMB Time & Scheduling", status: "ACTIVE" as const },
    { name: "Sling", websiteUrl: "https://getsling.com", marketSegment: "Shift Management", status: "ACTIVE" as const },
    { name: "Connecteam", websiteUrl: "https://connecteam.com", marketSegment: "Deskless Workforce", status: "ACTIVE" as const },
    { name: "7shifts", websiteUrl: "https://www.7shifts.com", marketSegment: "Restaurant Scheduling", status: "MONITORING" as const },
  ];

  const competitors: Record<string, any> = {};
  for (const data of competitorData) {
    const comp = await prisma.competitor.upsert({
      where: { id: data.name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: data,
    });
    competitors[comp.name] = comp;
  }

  // Create features with coverages
  const featureData = [
    { name: "Auto-scheduling", description: "AI-powered automatic schedule generation based on demand, availability, and rules", category: "Scheduling" },
    { name: "Drag-and-drop shifts", description: "Visual schedule editor with drag-and-drop shift assignment", category: "Scheduling" },
    { name: "Open shift bidding", description: "Allow employees to claim available open shifts", category: "Scheduling" },
    { name: "Shift templates", description: "Reusable schedule templates for common shift patterns", category: "Scheduling" },
    { name: "Multi-location scheduling", description: "Schedule management across multiple work locations", category: "Scheduling" },
    { name: "Clock-in/out", description: "Digital time clock for employee punch-in and punch-out", category: "Time & Attendance" },
    { name: "GPS verification", description: "Location-based verification of clock-in at correct work site", category: "Time & Attendance" },
    { name: "Timesheet approval", description: "Manager review and approval workflow for timesheets", category: "Time & Attendance" },
    { name: "Overtime tracking", description: "Automatic calculation and alerting for overtime hours", category: "Time & Attendance" },
    { name: "Employee profiles", description: "Centralized employee information management", category: "HR & Employee Management" },
    { name: "Document management", description: "Store and manage employee documents and certifications", category: "HR & Employee Management" },
    { name: "Onboarding workflows", description: "Structured new hire onboarding process with task checklists", category: "HR & Employee Management" },
    { name: "Break enforcement", description: "Automatic enforcement of required break periods per labor law", category: "Compliance & Labor Law" },
    { name: "Minimum rest rules", description: "Enforce minimum rest periods between consecutive shifts", category: "Compliance & Labor Law" },
    { name: "In-app messaging", description: "Built-in team communication and direct messaging", category: "Communication" },
    { name: "Shift announcements", description: "Broadcast announcements to teams or all employees", category: "Communication" },
    { name: "Push notifications", description: "Real-time mobile push notifications for schedule changes", category: "Communication" },
    { name: "Labor cost reporting", description: "Detailed labor cost analysis and reporting dashboards", category: "Reporting & Analytics" },
    { name: "Forecast vs actuals", description: "Compare scheduled labor costs against actual worked hours", category: "Reporting & Analytics" },
    { name: "Payroll integrations", description: "Direct integration with payroll providers", category: "Integrations" },
    { name: "POS integration", description: "Connect with point-of-sale systems for demand-based scheduling", category: "Integrations" },
    { name: "API access", description: "Public REST API for custom integrations", category: "Integrations" },
    { name: "Mobile schedule view", description: "View work schedule on mobile app", category: "Employee App (Mobile)" },
    { name: "Shift swap", description: "Employee-initiated shift trading with manager approval", category: "Employee App (Mobile)" },
    { name: "Leave requests", description: "Submit and track time-off requests from mobile", category: "Employee App (Mobile)" },
    { name: "Demand forecasting", description: "AI-based prediction of staffing demand", category: "AI & Automation" },
    { name: "Smart recommendations", description: "AI suggestions for schedule optimization", category: "AI & Automation" },
    { name: "Guided setup wizard", description: "Step-by-step onboarding wizard for initial configuration", category: "Onboarding & Setup" },
    { name: "CSV import", description: "Bulk import employees and schedules via CSV", category: "Onboarding & Setup" },
  ];

  // Coverage matrix - simulated data
  const coverageMap: Record<string, Record<string, string>> = {
    "Auto-scheduling": { Deputy: "SUPPORTED", "When I Work": "PARTIAL", Homebase: "NOT_SUPPORTED", Sling: "NOT_SUPPORTED", Connecteam: "PARTIAL", "7shifts": "SUPPORTED" },
    "Drag-and-drop shifts": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Open shift bidding": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "PARTIAL", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Shift templates": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "PARTIAL", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Multi-location scheduling": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "PARTIAL", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Clock-in/out": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "GPS verification": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "NOT_SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "PARTIAL" },
    "Timesheet approval": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Overtime tracking": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "PARTIAL", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Employee profiles": { Deputy: "SUPPORTED", "When I Work": "PARTIAL", Homebase: "SUPPORTED", Sling: "PARTIAL", Connecteam: "SUPPORTED", "7shifts": "PARTIAL" },
    "Document management": { Deputy: "PARTIAL", "When I Work": "NOT_SUPPORTED", Homebase: "PARTIAL", Sling: "NOT_SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "NOT_SUPPORTED" },
    "Onboarding workflows": { Deputy: "PARTIAL", "When I Work": "NOT_SUPPORTED", Homebase: "SUPPORTED", Sling: "NOT_SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "NOT_SUPPORTED" },
    "Break enforcement": { Deputy: "SUPPORTED", "When I Work": "PARTIAL", Homebase: "SUPPORTED", Sling: "NOT_SUPPORTED", Connecteam: "PARTIAL", "7shifts": "SUPPORTED" },
    "Minimum rest rules": { Deputy: "SUPPORTED", "When I Work": "NOT_SUPPORTED", Homebase: "PARTIAL", Sling: "NOT_SUPPORTED", Connecteam: "NOT_SUPPORTED", "7shifts": "PARTIAL" },
    "In-app messaging": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Shift announcements": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Push notifications": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Labor cost reporting": { Deputy: "SUPPORTED", "When I Work": "PARTIAL", Homebase: "PARTIAL", Sling: "PARTIAL", Connecteam: "PARTIAL", "7shifts": "SUPPORTED" },
    "Forecast vs actuals": { Deputy: "SUPPORTED", "When I Work": "NOT_SUPPORTED", Homebase: "NOT_SUPPORTED", Sling: "NOT_SUPPORTED", Connecteam: "NOT_SUPPORTED", "7shifts": "SUPPORTED" },
    "Payroll integrations": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "PARTIAL", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "POS integration": { Deputy: "SUPPORTED", "When I Work": "NOT_SUPPORTED", Homebase: "PARTIAL", Sling: "NOT_SUPPORTED", Connecteam: "NOT_SUPPORTED", "7shifts": "SUPPORTED" },
    "API access": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "PARTIAL", Sling: "NOT_SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Mobile schedule view": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Shift swap": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Leave requests": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "Demand forecasting": { Deputy: "SUPPORTED", "When I Work": "NOT_SUPPORTED", Homebase: "NOT_SUPPORTED", Sling: "NOT_SUPPORTED", Connecteam: "NOT_SUPPORTED", "7shifts": "PARTIAL" },
    "Smart recommendations": { Deputy: "PARTIAL", "When I Work": "NOT_SUPPORTED", Homebase: "NOT_SUPPORTED", Sling: "NOT_SUPPORTED", Connecteam: "NOT_SUPPORTED", "7shifts": "NOT_SUPPORTED" },
    "Guided setup wizard": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
    "CSV import": { Deputy: "SUPPORTED", "When I Work": "SUPPORTED", Homebase: "SUPPORTED", Sling: "SUPPORTED", Connecteam: "SUPPORTED", "7shifts": "SUPPORTED" },
  };

  for (const fData of featureData) {
    const feature = await prisma.feature.create({
      data: {
        name: fData.name,
        description: fData.description,
        categoryId: categories[fData.category]?.id,
      },
    });

    const coverages = coverageMap[fData.name];
    if (coverages) {
      for (const [compName, status] of Object.entries(coverages)) {
        const comp = competitors[compName];
        if (comp) {
          await prisma.featureCoverage.create({
            data: {
              featureId: feature.id,
              competitorId: comp.id,
              status: status as any,
              reviewStatus: "APPROVED",
              lastVerified: new Date(),
            },
          });
        }
      }
    }
  }

  console.log("Seed complete!");
  console.log("Login credentials:");
  console.log("  Admin:  admin@competitoriq.com / admin123");
  console.log("  Editor: editor@competitoriq.com / editor123");
  console.log("  Viewer: viewer@competitoriq.com / viewer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
