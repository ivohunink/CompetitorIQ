-- CompetitorIQ: Full Schema + Seed Data for Neon
-- Paste this entire file into the Neon SQL Editor

-- ============================================================
-- SCHEMA
-- ============================================================

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE "CompetitorStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "SupportStatus" AS ENUM ('SUPPORTED', 'PARTIAL', 'NOT_SUPPORTED', 'UNKNOWN');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "marketSegment" TEXT,
    "notes" TEXT,
    "status" "CompetitorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "competitorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lastScraped" TIMESTAMP(3),
    "scrapeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cadence" TEXT NOT NULL DEFAULT 'weekly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DataSource_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Category" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Subcategory_name_categoryId_key" ON "Subcategory"("name", "categoryId");

CREATE TABLE "Feature" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "isOwnProduct" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Feature_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Feature_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "FeatureCoverage" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "featureId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "status" "SupportStatus" NOT NULL DEFAULT 'UNKNOWN',
    "evidenceUrl" TEXT,
    "lastVerified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'APPROVED',
    "confidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeatureCoverage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FeatureCoverage_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeatureCoverage_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FeatureCoverage_featureId_competitorId_key" ON "FeatureCoverage"("featureId", "competitorId");

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "competitorId" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Users (admin123 / editor123 / viewer123)
INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "updatedAt") VALUES
  ('usr-admin', 'admin@competitoriq.com', 'Admin User', '$2a$12$lIz.QSpOlfwYBXhxx61uNuxmrO89foMl5GgA1W0.37QqEkSXK0u12', 'ADMIN', CURRENT_TIMESTAMP),
  ('usr-editor', 'editor@competitoriq.com', 'PM Editor', '$2a$12$Gv/4d4l7xCCih0V0oa9hc.MH9z/sD7J.Ny8K5AGbnB6meenFoSE6K', 'EDITOR', CURRENT_TIMESTAMP),
  ('usr-viewer', 'viewer@competitoriq.com', 'Marketing Viewer', '$2a$12$S/dz/KW87yTvcvMueL5y7Ot4TpE9CmGwBCTyfQrwBMJfqBvPohbVG', 'VIEWER', CURRENT_TIMESTAMP);

-- Categories
INSERT INTO "Category" ("id", "name", "description", "sortOrder", "updatedAt") VALUES
  ('cat-scheduling', 'Scheduling', 'Auto-scheduling, shift management, and workforce planning', 0, CURRENT_TIMESTAMP),
  ('cat-time', 'Time & Attendance', 'Clock-in/out, timesheets, and overtime tracking', 1, CURRENT_TIMESTAMP),
  ('cat-hr', 'HR & Employee Management', 'Employee profiles, onboarding, and performance', 2, CURRENT_TIMESTAMP),
  ('cat-compliance', 'Compliance & Labor Law', 'Break rules, labor law compliance, and audit trails', 3, CURRENT_TIMESTAMP),
  ('cat-communication', 'Communication', 'Messaging, announcements, and availability management', 4, CURRENT_TIMESTAMP),
  ('cat-reporting', 'Reporting & Analytics', 'Dashboards, labor cost reports, and data export', 5, CURRENT_TIMESTAMP),
  ('cat-integrations', 'Integrations', 'Payroll, POS, ATS, and API connectivity', 6, CURRENT_TIMESTAMP),
  ('cat-mobile', 'Employee App (Mobile)', 'Mobile schedule view, shift swap, and leave requests', 7, CURRENT_TIMESTAMP),
  ('cat-ai', 'AI & Automation', 'AI scheduling, demand forecasting, and smart alerts', 8, CURRENT_TIMESTAMP),
  ('cat-onboarding', 'Onboarding & Setup', 'Guided setup, CSV import, and template libraries', 9, CURRENT_TIMESTAMP);

-- Competitors
INSERT INTO "Competitor" ("id", "name", "websiteUrl", "marketSegment", "status", "updatedAt") VALUES
  ('comp-deputy', 'Deputy', 'https://www.deputy.com', 'SMB Workforce Management', 'ACTIVE', CURRENT_TIMESTAMP),
  ('comp-wheniwork', 'When I Work', 'https://wheniwork.com', 'Shift Scheduling', 'ACTIVE', CURRENT_TIMESTAMP),
  ('comp-homebase', 'Homebase', 'https://joinhomebase.com', 'SMB Time & Scheduling', 'ACTIVE', CURRENT_TIMESTAMP),
  ('comp-sling', 'Sling', 'https://getsling.com', 'Shift Management', 'ACTIVE', CURRENT_TIMESTAMP),
  ('comp-connecteam', 'Connecteam', 'https://connecteam.com', 'Deskless Workforce', 'ACTIVE', CURRENT_TIMESTAMP),
  ('comp-7shifts', '7shifts', 'https://www.7shifts.com', 'Restaurant Scheduling', 'ACTIVE', CURRENT_TIMESTAMP);

-- Features
INSERT INTO "Feature" ("id", "name", "description", "categoryId", "updatedAt") VALUES
  ('feat-auto-sched', 'Auto-scheduling', 'AI-powered automatic schedule generation based on demand, availability, and rules', 'cat-scheduling', CURRENT_TIMESTAMP),
  ('feat-drag-drop', 'Drag-and-drop shifts', 'Visual schedule editor with drag-and-drop shift assignment', 'cat-scheduling', CURRENT_TIMESTAMP),
  ('feat-open-shift', 'Open shift bidding', 'Allow employees to claim available open shifts', 'cat-scheduling', CURRENT_TIMESTAMP),
  ('feat-shift-tmpl', 'Shift templates', 'Reusable schedule templates for common shift patterns', 'cat-scheduling', CURRENT_TIMESTAMP),
  ('feat-multi-loc', 'Multi-location scheduling', 'Schedule management across multiple work locations', 'cat-scheduling', CURRENT_TIMESTAMP),
  ('feat-clock', 'Clock-in/out', 'Digital time clock for employee punch-in and punch-out', 'cat-time', CURRENT_TIMESTAMP),
  ('feat-gps', 'GPS verification', 'Location-based verification of clock-in at correct work site', 'cat-time', CURRENT_TIMESTAMP),
  ('feat-timesheet', 'Timesheet approval', 'Manager review and approval workflow for timesheets', 'cat-time', CURRENT_TIMESTAMP),
  ('feat-overtime', 'Overtime tracking', 'Automatic calculation and alerting for overtime hours', 'cat-time', CURRENT_TIMESTAMP),
  ('feat-profiles', 'Employee profiles', 'Centralized employee information management', 'cat-hr', CURRENT_TIMESTAMP),
  ('feat-docs', 'Document management', 'Store and manage employee documents and certifications', 'cat-hr', CURRENT_TIMESTAMP),
  ('feat-onboard-wf', 'Onboarding workflows', 'Structured new hire onboarding process with task checklists', 'cat-hr', CURRENT_TIMESTAMP),
  ('feat-breaks', 'Break enforcement', 'Automatic enforcement of required break periods per labor law', 'cat-compliance', CURRENT_TIMESTAMP),
  ('feat-rest', 'Minimum rest rules', 'Enforce minimum rest periods between consecutive shifts', 'cat-compliance', CURRENT_TIMESTAMP),
  ('feat-messaging', 'In-app messaging', 'Built-in team communication and direct messaging', 'cat-communication', CURRENT_TIMESTAMP),
  ('feat-announce', 'Shift announcements', 'Broadcast announcements to teams or all employees', 'cat-communication', CURRENT_TIMESTAMP),
  ('feat-push', 'Push notifications', 'Real-time mobile push notifications for schedule changes', 'cat-communication', CURRENT_TIMESTAMP),
  ('feat-labor-cost', 'Labor cost reporting', 'Detailed labor cost analysis and reporting dashboards', 'cat-reporting', CURRENT_TIMESTAMP),
  ('feat-forecast', 'Forecast vs actuals', 'Compare scheduled labor costs against actual worked hours', 'cat-reporting', CURRENT_TIMESTAMP),
  ('feat-payroll', 'Payroll integrations', 'Direct integration with payroll providers', 'cat-integrations', CURRENT_TIMESTAMP),
  ('feat-pos', 'POS integration', 'Connect with point-of-sale systems for demand-based scheduling', 'cat-integrations', CURRENT_TIMESTAMP),
  ('feat-api', 'API access', 'Public REST API for custom integrations', 'cat-integrations', CURRENT_TIMESTAMP),
  ('feat-mobile-view', 'Mobile schedule view', 'View work schedule on mobile app', 'cat-mobile', CURRENT_TIMESTAMP),
  ('feat-swap', 'Shift swap', 'Employee-initiated shift trading with manager approval', 'cat-mobile', CURRENT_TIMESTAMP),
  ('feat-leave', 'Leave requests', 'Submit and track time-off requests from mobile', 'cat-mobile', CURRENT_TIMESTAMP),
  ('feat-demand', 'Demand forecasting', 'AI-based prediction of staffing demand', 'cat-ai', CURRENT_TIMESTAMP),
  ('feat-smart', 'Smart recommendations', 'AI suggestions for schedule optimization', 'cat-ai', CURRENT_TIMESTAMP),
  ('feat-wizard', 'Guided setup wizard', 'Step-by-step onboarding wizard for initial configuration', 'cat-onboarding', CURRENT_TIMESTAMP),
  ('feat-csv', 'CSV import', 'Bulk import employees and schedules via CSV', 'cat-onboarding', CURRENT_TIMESTAMP);

-- Feature Coverage (competitor x feature matrix)
INSERT INTO "FeatureCoverage" ("featureId", "competitorId", "status", "reviewStatus", "lastVerified", "updatedAt") VALUES
  -- Auto-scheduling
  ('feat-auto-sched', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-auto-sched', 'comp-wheniwork', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-auto-sched', 'comp-homebase', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-auto-sched', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-auto-sched', 'comp-connecteam', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-auto-sched', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Drag-and-drop shifts
  ('feat-drag-drop', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-drag-drop', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-drag-drop', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-drag-drop', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-drag-drop', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-drag-drop', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Open shift bidding
  ('feat-open-shift', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-open-shift', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-open-shift', 'comp-homebase', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-open-shift', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-open-shift', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-open-shift', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Shift templates
  ('feat-shift-tmpl', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-shift-tmpl', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-shift-tmpl', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-shift-tmpl', 'comp-sling', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-shift-tmpl', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-shift-tmpl', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Multi-location scheduling
  ('feat-multi-loc', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-multi-loc', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-multi-loc', 'comp-homebase', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-multi-loc', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-multi-loc', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-multi-loc', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Clock-in/out
  ('feat-clock', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-clock', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-clock', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-clock', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-clock', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-clock', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- GPS verification
  ('feat-gps', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-gps', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-gps', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-gps', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-gps', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-gps', 'comp-7shifts', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Timesheet approval
  ('feat-timesheet', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-timesheet', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-timesheet', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-timesheet', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-timesheet', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-timesheet', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Overtime tracking
  ('feat-overtime', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-overtime', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-overtime', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-overtime', 'comp-sling', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-overtime', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-overtime', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Employee profiles
  ('feat-profiles', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-profiles', 'comp-wheniwork', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-profiles', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-profiles', 'comp-sling', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-profiles', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-profiles', 'comp-7shifts', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Document management
  ('feat-docs', 'comp-deputy', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-docs', 'comp-wheniwork', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-docs', 'comp-homebase', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-docs', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-docs', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-docs', 'comp-7shifts', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Onboarding workflows
  ('feat-onboard-wf', 'comp-deputy', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-onboard-wf', 'comp-wheniwork', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-onboard-wf', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-onboard-wf', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-onboard-wf', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-onboard-wf', 'comp-7shifts', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Break enforcement
  ('feat-breaks', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-breaks', 'comp-wheniwork', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-breaks', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-breaks', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-breaks', 'comp-connecteam', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-breaks', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Minimum rest rules
  ('feat-rest', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-rest', 'comp-wheniwork', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-rest', 'comp-homebase', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-rest', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-rest', 'comp-connecteam', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-rest', 'comp-7shifts', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- In-app messaging
  ('feat-messaging', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-messaging', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-messaging', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-messaging', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-messaging', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-messaging', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Shift announcements
  ('feat-announce', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-announce', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-announce', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-announce', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-announce', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-announce', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Push notifications
  ('feat-push', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-push', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-push', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-push', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-push', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-push', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Labor cost reporting
  ('feat-labor-cost', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-labor-cost', 'comp-wheniwork', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-labor-cost', 'comp-homebase', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-labor-cost', 'comp-sling', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-labor-cost', 'comp-connecteam', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-labor-cost', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Forecast vs actuals
  ('feat-forecast', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-forecast', 'comp-wheniwork', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-forecast', 'comp-homebase', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-forecast', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-forecast', 'comp-connecteam', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-forecast', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Payroll integrations
  ('feat-payroll', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-payroll', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-payroll', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-payroll', 'comp-sling', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-payroll', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-payroll', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- POS integration
  ('feat-pos', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-pos', 'comp-wheniwork', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-pos', 'comp-homebase', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-pos', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-pos', 'comp-connecteam', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-pos', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- API access
  ('feat-api', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-api', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-api', 'comp-homebase', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-api', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-api', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-api', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Mobile schedule view
  ('feat-mobile-view', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-mobile-view', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-mobile-view', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-mobile-view', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-mobile-view', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-mobile-view', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Shift swap
  ('feat-swap', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-swap', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-swap', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-swap', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-swap', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-swap', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Leave requests
  ('feat-leave', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-leave', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-leave', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-leave', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-leave', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-leave', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Demand forecasting
  ('feat-demand', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-demand', 'comp-wheniwork', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-demand', 'comp-homebase', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-demand', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-demand', 'comp-connecteam', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-demand', 'comp-7shifts', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Smart recommendations
  ('feat-smart', 'comp-deputy', 'PARTIAL', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-smart', 'comp-wheniwork', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-smart', 'comp-homebase', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-smart', 'comp-sling', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-smart', 'comp-connecteam', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-smart', 'comp-7shifts', 'NOT_SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- Guided setup wizard
  ('feat-wizard', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-wizard', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-wizard', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-wizard', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-wizard', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-wizard', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  -- CSV import
  ('feat-csv', 'comp-deputy', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-csv', 'comp-wheniwork', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-csv', 'comp-homebase', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-csv', 'comp-sling', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-csv', 'comp-connecteam', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat-csv', 'comp-7shifts', 'SUPPORTED', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
