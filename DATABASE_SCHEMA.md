# Complete Database Schema Documentation

This document provides a comprehensive overview of all database tables and their foreign key relationships.

## Table of Contents
1. [Core Tables](#core-tables)
2. [User & Profile Tables](#user--profile-tables)
3. [Company Tables](#company-tables)
4. [Shift Management Tables](#shift-management-tables)
5. [Worker Tables](#worker-tables)
6. [Financial Tables](#financial-tables)
7. [System Tables](#system-tables)
8. [Foreign Key Relationships](#foreign-key-relationships)

---

## Core Tables

### profiles
Primary user table that extends `auth.users`.

**Columns:**
- `id` (UUID, PK) - References `auth.users(id)`
- `role` (TEXT) - 'worker', 'company', or 'admin'
- `email` (TEXT)
- `is_verified` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Foreign Keys:**
- `id` → `auth.users(id)`

---

## User & Profile Tables

### worker_details
Worker-specific profile information.

**Columns:**
- `profile_id` (UUID, PK) - References `profiles(id)`
- `first_name`, `last_name`, `phone_number`
- `avatar_url`
- `cpr_number_encrypted` (TEXT) - Encrypted CPR number
- `tax_card_type` - 'Hovedkort', 'Bikort', or 'Frikort'
- `bank_reg_number`, `bank_account_number`
- `su_limit_amount`
- `shirt_size`, `shoe_size`
- `strike_count` (INTEGER)
- `is_banned` (BOOLEAN)
- `created_at`, `updated_at`

**Foreign Keys:**
- `profile_id` → `profiles(id)`

### company_details
Company-specific profile information.

**Columns:**
- `profile_id` (UUID, PK) - References `profiles(id)`
- `company_name`, `cvr_number` (UNIQUE)
- `main_address`
- `ean_number`
- `stripe_customer_id`
- `subscription_status` - 'active', 'inactive', or 'cancelled'
- `logo_url`, `cover_photo_url`
- `created_at`, `updated_at`

**Foreign Keys:**
- `profile_id` → `profiles(id)`

---

## Company Tables

### locations
Company location addresses with PostGIS coordinates.

**Columns:**
- `id` (UUID, PK)
- `company_id` (UUID) - References `profiles(id)`
- `name`, `address`
- `coordinates` (GEOGRAPHY(POINT, 4326))
- `created_at`, `updated_at`

**Foreign Keys:**
- `company_id` → `profiles(id)`

### shift_templates
Templates for recurring shifts.

**Columns:**
- `id` (UUID, PK)
- `company_id` (UUID) - References `profiles(id)`
- `location_id` (UUID) - References `locations(id)`
- `title`, `description`, `category`
- `start_time` (TIME), `end_time` (TIME)
- `hourly_rate`
- `vacancies_total`
- `requirements` (JSONB) - **DEPRECATED**: Use `shift_template_requirements` table instead
- `must_bring` (TEXT) - Items/equipment worker must bring
- `break_minutes` (INTEGER) - Break duration in minutes (0 = no break)
- `is_break_paid` (BOOLEAN) - Whether break is paid (true) or unpaid (false)
- `recurrence_pattern`
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Foreign Keys:**
- `company_id` → `profiles(id)`
- `location_id` → `locations(id)`

### shift_template_requirements
Junction table linking templates to required skills (many-to-many).

**Columns:**
- `id` (UUID, PK)
- `template_id` (UUID) - References `shift_templates(id)`
- `skill_id` (UUID) - References `skills(id)`
- `created_at` (TIMESTAMPTZ)
- UNIQUE(`template_id`, `skill_id`)

**Foreign Keys:**
- `template_id` → `shift_templates(id)` ON DELETE CASCADE
- `skill_id` → `skills(id)` ON DELETE CASCADE

---

## Shift Management Tables

### shifts
Job shift postings.

**Columns:**
- `id` (UUID, PK)
- `company_id` (UUID) - References `profiles(id)`
- `location_id` (UUID) - References `locations(id)`
- `title`, `description`, `category`
- `start_time`, `end_time` (TIMESTAMPTZ)
- `hourly_rate`
- `vacancies_total`, `vacancies_taken`
- `requirements` (JSONB)
- `status` - 'published', 'full', 'completed', or 'cancelled'
- `created_at`, `updated_at`

**Foreign Keys:**
- `company_id` → `profiles(id)`
- `location_id` → `locations(id)`

### shift_applications
Worker applications for shifts.

**Columns:**
- `id` (UUID, PK)
- `shift_id` (UUID) - References `shifts(id)`
- `worker_id` (UUID) - References `profiles(id)`
- `company_id` (UUID) - References `profiles(id)`
- `status` - 'pending', 'accepted', 'rejected', 'waitlist', or 'completed'
- `worker_message` (TEXT)
- `applied_at` (TIMESTAMPTZ)
- UNIQUE(`shift_id`, `worker_id`)

**Foreign Keys:**
- `shift_id` → `shifts(id)`
- `worker_id` → `profiles(id)`
- `company_id` → `profiles(id)`

### applications
General job applications (separate from shift_applications).

**Columns:**
- `id` (UUID, PK)
- `company_id` (UUID) - References `profiles(id)`
- `shift_id` (UUID) - References `shifts(id)`
- `worker_id` (UUID) - References `profiles(id)`
- `status` - 'pending', 'accepted', 'rejected', or 'withdrawn'
- `applied_at`, `updated_at`
- UNIQUE(`shift_id`, `worker_id`)

**Foreign Keys:**
- `company_id` → `profiles(id)`
- `shift_id` → `shifts(id)`
- `worker_id` → `profiles(id)`

---

## Worker Tables

### documents
KYC documents uploaded by workers.

**Columns:**
- `id` (UUID, PK)
- `worker_id` (UUID) - References `profiles(id)`
- `type` - 'id_card_front', 'id_card_back', 'selfie', 'criminal_record', or 'driving_license'
- `file_path`
- `verification_status` - 'pending', 'approved', or 'rejected'
- `created_at`, `updated_at`

**Foreign Keys:**
- `worker_id` → `profiles(id)`

### worker_skills
Worker skills and certifications.

**Columns:**
- `id` (UUID, PK)
- `worker_id` (UUID) - References `profiles(id)`
- `skill_id` (UUID) - References `skills(id)`
- `proof_document_id` (UUID) - References `documents(id)`
- `verified` (BOOLEAN)
- `created_at`, `updated_at`
- UNIQUE(`worker_id`, `skill_id`)

**Foreign Keys:**
- `worker_id` → `profiles(id)`
- `skill_id` → `skills(id)`
- `proof_document_id` → `documents(id)`

### skills
Available skills catalog.

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT, UNIQUE)
- `description`, `category`
- `created_at`, `updated_at`

**Foreign Keys:**
- None (standalone reference table)

### timesheets
Time tracking and payroll records.

**Columns:**
- `id` (UUID, PK)
- `shift_id` (UUID) - References `shifts(id)`
- `worker_id` (UUID) - References `profiles(id)`
- `clock_in_time`, `clock_out_time` (TIMESTAMPTZ)
- `clock_in_location` (TEXT)
- `manager_approved_start`, `manager_approved_end` (TIMESTAMPTZ)
- `is_no_show` (BOOLEAN)
- `status` - 'pending', 'approved', 'disputed', or 'paid'
- `created_at`, `updated_at`
- UNIQUE(`shift_id`, `worker_id`)

**Foreign Keys:**
- `shift_id` → `shifts(id)`
- `worker_id` → `profiles(id)`

### strike_history
Worker strike records.

**Columns:**
- `id` (UUID, PK)
- `worker_id` (UUID) - References `profiles(id)`
- `shift_id` (UUID) - References `shifts(id)`
- `reason` (TEXT)
- `issued_by` (UUID) - References `profiles(id)`
- `created_at` (TIMESTAMPTZ)

**Foreign Keys:**
- `worker_id` → `profiles(id)`
- `shift_id` → `shifts(id)`
- `issued_by` → `profiles(id)`

### reviews
Worker and company reviews.

**Columns:**
- `id` (UUID, PK)
- `reviewee_id` (UUID) - References `profiles(id)`
- `reviewer_id` (UUID) - References `profiles(id)`
- `shift_id` (UUID) - References `shifts(id)`
- `rating` (INTEGER, 1-5)
- `comment` (TEXT)
- `created_at`, `updated_at`
- UNIQUE(`shift_id`, `reviewer_id`, `reviewee_id`)

**Foreign Keys:**
- `reviewee_id` → `profiles(id)`
- `reviewer_id` → `profiles(id)`
- `shift_id` → `shifts(id)`

---

## Financial Tables

### payments
Payment records for completed shifts.

**Columns:**
- `id` (UUID, PK)
- `application_id` (UUID) - References `shift_applications(id)`
- `shift_id` (UUID) - References `shifts(id)`
- `worker_id` (UUID) - References `profiles(id)`
- `company_id` (UUID) - References `profiles(id)`
- `amount`, `hourly_rate`, `hours_worked`
- `shift_title_snapshot`, `worker_name_snapshot`
- `status` - 'pending', 'paid', or 'cancelled'
- `created_at`, `updated_at`
- UNIQUE(`application_id`)

**Foreign Keys:**
- `application_id` → `shift_applications(id)`
- `shift_id` → `shifts(id)`
- `worker_id` → `profiles(id)`
- `company_id` → `profiles(id)`

### ledger_entries
Financial ledger for accounting.

**Columns:**
- `id` (UUID, PK)
- `company_id` (UUID) - References `profiles(id)`
- `worker_id` (UUID) - References `profiles(id)`
- `shift_id` (UUID) - References `shifts(id)`
- `entry_type` - 'payment', 'refund', 'adjustment', or 'fee'
- `amount`
- `description`
- `created_at`, `updated_at`

**Foreign Keys:**
- `company_id` → `profiles(id)`
- `worker_id` → `profiles(id)`
- `shift_id` → `shifts(id)`

---

## System Tables

### audit_logs
System audit trail.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID) - References `profiles(id)`
- `changed_by` (UUID) - References `profiles(id)`
- `action` (TEXT)
- `table_name` (TEXT)
- `record_id` (TEXT)
- `old_values`, `new_values` (JSONB)
- `created_at` (TIMESTAMPTZ)

**Foreign Keys:**
- `user_id` → `profiles(id)`
- `changed_by` → `profiles(id)`

### user_events
User activity tracking/analytics.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID) - References `profiles(id)`
- `event_type` (TEXT)
- `event_data` (JSONB)
- `created_at` (TIMESTAMPTZ)

**Foreign Keys:**
- `user_id` → `profiles(id)`

### notification_logs
User notification history.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID) - References `profiles(id)`
- `notification_type` (TEXT)
- `title`, `message` (TEXT)
- `read` (BOOLEAN)
- `read_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

**Foreign Keys:**
- `user_id` → `profiles(id)`

### user_consents
GDPR consent tracking.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID) - References `profiles(id)`
- `consent_type` - 'terms', 'privacy', or 'cookies'
- `version` (TEXT)
- `accepted` (BOOLEAN)
- `accepted_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- UNIQUE(`user_id`, `consent_type`, `version`)

**Foreign Keys:**
- `user_id` → `profiles(id)`

---

## Foreign Key Relationships

### Complete Relationship Map

| Source Table | Source Column | Target Table | Target Column |
|-------------|---------------|--------------|---------------|
| locations | company_id | profiles | id |
| company_details | profile_id | profiles | id |
| shift_applications | company_id | profiles | id |
| shift_applications | shift_id | shifts | id |
| shift_applications | worker_id | profiles | id |
| timesheets | shift_id | shifts | id |
| timesheets | worker_id | profiles | id |
| documents | worker_id | profiles | id |
| shifts | company_id | profiles | id |
| shifts | location_id | locations | id |
| worker_details | profile_id | profiles | id |
| audit_logs | user_id | profiles | id |
| audit_logs | changed_by | profiles | id |
| user_events | user_id | profiles | id |
| notification_logs | user_id | profiles | id |
| user_consents | user_id | profiles | id |
| ledger_entries | company_id | profiles | id |
| ledger_entries | worker_id | profiles | id |
| reviews | reviewee_id | profiles | id |
| reviews | reviewer_id | profiles | id |
| reviews | shift_id | shifts | id |
| strike_history | issued_by | profiles | id |
| strike_history | shift_id | shifts | id |
| strike_history | worker_id | profiles | id |
| worker_skills | proof_document_id | documents | id |
| worker_skills | skill_id | skills | id |
| worker_skills | worker_id | profiles | id |
| applications | company_id | profiles | id |
| applications | shift_id | shifts | id |
| applications | worker_id | profiles | id |
| shift_templates | company_id | profiles | id |
| shift_templates | location_id | locations | id |
| shift_template_requirements | template_id | shift_templates | id |
| shift_template_requirements | skill_id | skills | id |
| payments | application_id | shift_applications | id |
| payments | company_id | profiles | id |
| payments | shift_id | shifts | id |
| payments | worker_id | profiles | id |

---

## Migration Files

All schema changes are tracked in migration files located in `supabase/migrations/`:

1. `001_initial_schema.sql` - Initial database schema
2. `002_add_profile_insert_policy.sql` - Profile insert policies
3. `003_add_company_main_address.sql` - Company main address field
4. `004_add_company_details_insert_policy.sql` - Company details policies
5. `005_add_profile_name_fields_and_trigger.sql` - Profile name fields
6. `006_sync_details_to_profiles.sql` - Sync triggers
7. `007_add_worker_message_to_applications.sql` - Worker messages
8. `008_add_company_id_to_shift_applications.sql` - Company ID in applications
9. `009_update_vacancies_on_application_status.sql` - Vacancy triggers
10. `010_add_completed_status_and_payments_table.sql` - Payments table
11. `011_add_all_foreign_keys_and_missing_tables.sql` - Complete FK relationships and missing tables

---

## Notes

- All tables have Row Level Security (RLS) enabled
- All foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate
- Timestamps are automatically updated via triggers
- All sensitive data (CPR numbers) is encrypted using pgcrypto
- PostGIS is used for geographic coordinates in locations


