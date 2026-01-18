# Template v2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│  /[lang]/create-shift                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CreateShiftForm.tsx                              │
│                                                                     │
│  State:                                                             │
│  • templates: ShiftTemplate[]                                       │
│  • selectedTemplateId: string                                       │
│  • selectedSkillIds: string[]                                       │
│  • formData: { must_bring, break_minutes, is_break_paid, ... }     │
│                                                                     │
│  Functions:                                                         │
│  • handleTemplateSelect(templateId)                                 │
│  • handleDeleteTemplate(templateId)                                 │
│  • handleSubmit() → creates shift + optionally saves template       │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER ACTIONS                                   │
│  app/actions/templates.ts                                           │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ getTemplates(companyId)                                     │    │
│  │ • Verify auth & authorization                               │    │
│  │ • SELECT templates + requirements (JOIN)                    │    │
│  │ • Return templates with nested skill data                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ createTemplate(formData)                                    │    │
│  │ • Verify auth                                               │    │
│  │ • Validate required fields                                  │    │
│  │ • INSERT into shift_templates                               │    │
│  │ • INSERT into shift_template_requirements (batch)           │    │
│  │ • Return success + templateId                               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ updateTemplate(templateId, formData)                        │    │
│  │ • Verify auth & ownership                                   │    │
│  │ • UPDATE shift_templates (partial)                          │    │
│  │ • DELETE old requirements                                   │    │
│  │ • INSERT new requirements                                   │    │
│  │ • Return success                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ deleteTemplate(templateId)                                  │    │
│  │ • Verify auth & ownership                                   │    │
│  │ • UPDATE shift_templates SET is_active = false              │    │
│  │ • DELETE from shift_template_requirements                   │    │
│  │ • Return success                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                    │
│  (PostgreSQL + Supabase)                                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ shift_templates                                          │      │
│  │ • id (PK)                                                │      │
│  │ • company_id (FK → profiles)                             │      │
│  │ • location_id (FK → locations)                           │      │
│  │ • template_name                                          │      │
│  │ • title, description, category                           │      │
│  │ • hourly_rate, vacancies_total                           │      │
│  │ • must_bring ← NEW                                       │      │
│  │ • break_minutes ← NEW                                    │      │
│  │ • is_break_paid ← NEW                                    │      │
│  │ • is_active                                              │      │
│  │ • created_at, updated_at                                 │      │
│  └────────────────────────┬─────────────────────────────────┘      │
│                           │                                         │
│                           │ ONE-TO-MANY                             │
│                           │                                         │
│                           ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ shift_template_requirements                              │      │
│  │ • id (PK)                                                │      │
│  │ • template_id (FK → shift_templates) ──┐                │      │
│  │ • skill_id (FK → skills)               │                │      │
│  │ • created_at                           │                │      │
│  └────────────────────────────────────────┼────────────────┘      │
│                                           │                         │
│                                           │ MANY-TO-ONE             │
│                                           │                         │
│                                           ▼                         │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ skills                                                   │      │
│  │ • id (PK)                                                │      │
│  │ • name                                                   │      │
│  │ • category (language | license)                          │      │
│  │ • description                                            │      │
│  │ • created_at, updated_at                                 │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  RLS Policies:                                                      │
│  • Templates: SELECT/INSERT/UPDATE/DELETE by company_id            │
│  • Requirements: Managed via template ownership                     │
└─────────────────────────────────────────────────────────────────────┘


DATA FLOW EXAMPLES
═════════════════

1. LOADING TEMPLATES
   ────────────────
   
   Page.tsx → getTemplates(user.id)
        │
        └─→ Database: SELECT st.*, str.*, s.*
                      FROM shift_templates st
                      LEFT JOIN shift_template_requirements str ON str.template_id = st.id
                      LEFT JOIN skills s ON s.id = str.skill_id
                      WHERE st.company_id = user.id AND st.is_active = true
        │
        ▼
   [
     {
       id: "uuid-1",
       template_name: "Kitchen Staff",
       must_bring: "Black shoes, knife set",
       break_minutes: 30,
       is_break_paid: false,
       shift_template_requirements: [
         { skill_id: "skill-1", skills: { name: "Danish", category: "language" } },
         { skill_id: "skill-2", skills: { name: "English", category: "language" } }
       ]
     }
   ]
        │
        ▼
   CreateShiftForm (initialTemplates prop)
        │
        └─→ Dropdown shows: "Kitchen Staff"


2. SELECTING A TEMPLATE
   ────────────────────
   
   User clicks: "Kitchen Staff" in dropdown
        │
        ▼
   handleTemplateSelect("uuid-1")
        │
        ├─→ Extract template data:
        │   • title: "Kitchen Staff"
        │   • must_bring: "Black shoes, knife set"
        │   • break_minutes: 30
        │   • is_break_paid: false
        │
        ├─→ Extract skill IDs:
        │   templateSkillIds = ["skill-1", "skill-2"]
        │
        ├─→ Update form state:
        │   setFormData({ ...template fields })
        │
        └─→ Update skill checkboxes:
            setSelectedSkillIds(["skill-1", "skill-2"])
        │
        ▼
   Form populated with all template data
   Skill checkboxes for Danish & English are checked


3. CREATING A SHIFT WITH "SAVE AS TEMPLATE"
   ────────────────────────────────────────
   
   User fills form + checks "Save as Template"
        │
        ▼
   handleSubmit()
        │
        ├─→ Create shift (with requirements)
        │   • INSERT into shifts
        │   • INSERT into shift_requirements
        │
        └─→ createTemplate({
              template_name: "New Template",
              title: "...",
              must_bring: "...",
              break_minutes: 30,
              is_break_paid: true,
              skill_ids: ["skill-1", "skill-2"]
            })
            │
            ▼
         Server Action:
            │
            ├─→ INSERT into shift_templates
            │   RETURNING id
            │
            └─→ INSERT into shift_template_requirements
                VALUES 
                  (template_id, skill-1),
                  (template_id, skill-2)
            │
            ▼
         Success → Template available in dropdown


4. DELETING A TEMPLATE
   ───────────────────
   
   User selects "Kitchen Staff" template
        │
        └─→ Delete button (trash icon) appears
        │
        ▼
   User clicks delete button
        │
        └─→ Confirmation dialog: "Are you sure you want to delete 'Kitchen Staff'?"
        │
        ▼
   User confirms
        │
        └─→ deleteTemplate("uuid-1")
            │
            ▼
         Server Action:
            │
            ├─→ Verify ownership
            │
            ├─→ UPDATE shift_templates
            │   SET is_active = false
            │   WHERE id = "uuid-1"
            │
            └─→ DELETE FROM shift_template_requirements
                WHERE template_id = "uuid-1"
            │
            ▼
         Success → Template removed from dropdown
                 → Selection cleared
                 → Form not reset


AUTHORIZATION FLOW
═════════════════

┌──────────────┐
│ User Request │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Server Action       │
│ • getUser()         │
│ • Check auth        │
└──────┬──────────────┘
       │
       ├─→ NOT AUTHENTICATED → redirect('/login')
       │
       ▼
┌─────────────────────┐
│ Check Authorization │
│ • Verify company_id │
│ • Verify ownership  │
└──────┬──────────────┘
       │
       ├─→ NOT AUTHORIZED → return { error: "Unauthorized" }
       │
       ▼
┌─────────────────────┐
│ Database Operation  │
│ • RLS Policy Check  │
└──────┬──────────────┘
       │
       ├─→ RLS DENY → PostgreSQL Error
       │
       ▼
┌─────────────────────┐
│ Success             │
│ • Return data       │
└─────────────────────┘


SKILL MANAGEMENT
═══════════════

┌─────────────────────────────────────┐
│ Template has multiple skills        │
│                                     │
│  Template: "Kitchen Staff"          │
│    ├─ Danish (language)             │
│    ├─ English (language)            │
│    └─ Food Hygiene Cert (license)   │
└─────────────────────────────────────┘
                │
                │ Stored as:
                │
                ▼
┌─────────────────────────────────────┐
│ shift_template_requirements         │
│  • template_id: uuid-1              │
│    skill_id: skill-danish           │
│                                     │
│  • template_id: uuid-1              │
│    skill_id: skill-english          │
│                                     │
│  • template_id: uuid-1              │
│    skill_id: skill-food-hygiene     │
└─────────────────────────────────────┘
                │
                │ When loaded:
                │
                ▼
┌─────────────────────────────────────┐
│ Frontend receives:                  │
│  {                                  │
│    template_name: "Kitchen Staff",  │
│    shift_template_requirements: [   │
│      {                              │
│        skill_id: "...",             │
│        skills: {                    │
│          name: "Danish",            │
│          category: "language"       │
│        }                            │
│      },                             │
│      ...                            │
│    ]                                │
│  }                                  │
└─────────────────────────────────────┘
                │
                │ Skill IDs extracted:
                │
                ▼
┌─────────────────────────────────────┐
│ setSelectedSkillIds([               │
│   "skill-danish",                   │
│   "skill-english",                  │
│   "skill-food-hygiene"              │
│ ])                                  │
│                                     │
│ → Checkboxes are checked            │
└─────────────────────────────────────┘
```

## Key Design Decisions

### 1. Server-Side Template Fetching
**Why**: Security, performance, and SEO
- Templates fetched in page.tsx (server component)
- Authorization happens on server
- No client-side loading state for initial data

### 2. Relational Requirements Table
**Why**: Normalization and flexibility
- Avoids JSONB array in templates
- Enables JOIN queries for nested data
- Easy to add/remove requirements
- Foreign key constraints ensure data integrity

### 3. Soft Delete for Templates
**Why**: Data preservation and audit
- Templates marked inactive instead of deleted
- Can be restored if needed
- Historical data preserved
- Requirements still deleted (optional cascade)

### 4. Client-Side State Management
**Why**: Instant UI updates
- Templates stored in React state
- No refetch needed after operations
- Delete removes from state immediately
- Smooth user experience

### 5. Partial Updates in updateTemplate
**Why**: Flexibility
- Only provided fields are updated
- Unchanged fields remain intact
- Reduces risk of data loss
- Simpler API for clients

### 6. Skill ID Arrays
**Why**: Simplicity and type safety
- Frontend passes array of UUIDs
- Server handles relational mapping
- Type-safe at both ends
- Easy to validate
