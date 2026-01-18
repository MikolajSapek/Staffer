export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'worker' | 'company' | 'admin';
          email: string;
          verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
          average_rating: number | null;
          total_reviews: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: 'worker' | 'company' | 'admin';
          email: string;
          verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
          average_rating?: number | null;
          total_reviews?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'worker' | 'company' | 'admin';
          email?: string;
          verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
          average_rating?: number | null;
          total_reviews?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      worker_details: {
        Row: {
          profile_id: string;
          first_name: string;
          last_name: string;
          phone_number: string;
          avatar_url: string | null;
          cpr_number_encrypted: string;
          tax_card_type: 'Hovedkort' | 'Bikort' | 'Frikort';
          bank_reg_number: string;
          bank_account_number: string;
          su_limit_amount: number | null;
          shirt_size: string | null;
          shoe_size: string | null;
          strike_count: number;
          is_banned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          first_name: string;
          last_name: string;
          phone_number: string;
          avatar_url?: string | null;
          cpr_number_encrypted: string;
          tax_card_type: 'Hovedkort' | 'Bikort' | 'Frikort';
          bank_reg_number: string;
          bank_account_number: string;
          su_limit_amount?: number | null;
          shirt_size?: string | null;
          shoe_size?: string | null;
          strike_count?: number;
          is_banned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          first_name?: string;
          last_name?: string;
          phone_number?: string;
          avatar_url?: string | null;
          cpr_number_encrypted?: string;
          tax_card_type?: 'Hovedkort' | 'Bikort' | 'Frikort';
          bank_reg_number?: string;
          bank_account_number?: string;
          su_limit_amount?: number | null;
          shirt_size?: string | null;
          shoe_size?: string | null;
          strike_count?: number;
          is_banned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      company_details: {
        Row: {
          profile_id: string;
          company_name: string;
          cvr_number: string;
          main_address: string | null;
          ean_number: string | null;
          stripe_customer_id: string | null;
          subscription_status: 'active' | 'inactive' | 'cancelled';
          logo_url: string | null;
          cover_photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          company_name: string;
          cvr_number: string;
          main_address?: string | null;
          ean_number?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: 'active' | 'inactive' | 'cancelled';
          logo_url?: string | null;
          cover_photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          company_name?: string;
          cvr_number?: string;
          main_address?: string | null;
          ean_number?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: 'active' | 'inactive' | 'cancelled';
          logo_url?: string | null;
          cover_photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      locations: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          address: string;
          coordinates: string; // PostGIS geography type
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          address: string;
          coordinates: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          address?: string;
          coordinates?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      shifts: {
        Row: {
          id: string;
          company_id: string;
          location_id: string;
          title: string;
          description: string | null;
          category: string;
          start_time: string;
          end_time: string;
          hourly_rate: number;
          break_minutes: number;
          is_break_paid: boolean;
          vacancies_total: number;
          vacancies_taken: number;
          requirements: Json;
          must_bring: string | null;
          required_language_ids: string[];
          required_licence_ids: string[];
          required_languages_text: string[];  // Tablice tekstowe (czytelne)
          required_licences_text: string[];   // Tablice tekstowe (czytelne)
          status: 'published' | 'full' | 'completed' | 'cancelled';
          is_urgent: boolean;
          possible_overtime: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          location_id: string;
          title: string;
          description?: string | null;
          category: string;
          start_time: string;
          end_time: string;
          hourly_rate: number;
          break_minutes?: number;
          is_break_paid?: boolean;
          vacancies_total: number;
          vacancies_taken?: number;
          requirements?: Json;
          must_bring?: string | null;
          required_language_ids?: string[];
          required_licence_ids?: string[];
          required_languages_text?: string[];
          required_licences_text?: string[];
          status?: 'published' | 'full' | 'completed' | 'cancelled';
          is_urgent?: boolean;
          possible_overtime?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          location_id?: string;
          title?: string;
          description?: string | null;
          category?: string;
          start_time?: string;
          end_time?: string;
          hourly_rate?: number;
          break_minutes?: number;
          vacancies_total?: number;
          vacancies_taken?: number;
          requirements?: Json;
          must_bring?: string | null;
          required_language_ids?: string[];
          required_licence_ids?: string[];
          required_languages_text?: string[];
          required_licences_text?: string[];
          status?: 'published' | 'full' | 'completed' | 'cancelled';
          is_urgent?: boolean;
          possible_overtime?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      shift_applications: {
        Row: {
          id: string;
          shift_id: string;
          worker_id: string;
          company_id: string;
          status: 'pending' | 'accepted' | 'rejected' | 'waitlist';
          applied_at: string;
          worker_message: string | null;
        };
        Insert: {
          id?: string;
          shift_id: string;
          worker_id: string;
          company_id: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'waitlist';
          applied_at?: string;
          worker_message?: string | null;
        };
        Update: {
          id?: string;
          shift_id?: string;
          worker_id?: string;
          company_id?: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'waitlist';
          applied_at?: string;
          worker_message?: string | null;
        };
      };
      timesheets: {
        Row: {
          id: string;
          shift_id: string;
          worker_id: string;
          clock_in_time: string | null;
          clock_in_location: string | null;
          clock_out_time: string | null;
          manager_approved_start: string | null;
          manager_approved_end: string | null;
          is_no_show: boolean;
          was_disputed: boolean;
          status: 'pending' | 'approved' | 'disputed' | 'paid';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shift_id: string;
          worker_id: string;
          clock_in_time?: string | null;
          clock_in_location?: string | null;
          clock_out_time?: string | null;
          manager_approved_start?: string | null;
          manager_approved_end?: string | null;
          is_no_show?: boolean;
          was_disputed?: boolean;
          status?: 'pending' | 'approved' | 'disputed' | 'paid';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shift_id?: string;
          worker_id?: string;
          clock_in_time?: string | null;
          clock_in_location?: string | null;
          clock_out_time?: string | null;
          manager_approved_start?: string | null;
          manager_approved_end?: string | null;
          is_no_show?: boolean;
          was_disputed?: boolean;
          status?: 'pending' | 'approved' | 'disputed' | 'paid';
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          worker_id: string;
          type: 'id_card_front' | 'id_card_back' | 'selfie' | 'criminal_record' | 'driving_license';
          file_path: string;
          verification_status: 'pending' | 'approved' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          worker_id: string;
          type: 'id_card_front' | 'id_card_back' | 'selfie' | 'criminal_record' | 'driving_license';
          file_path: string;
          verification_status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          worker_id?: string;
          type?: 'id_card_front' | 'id_card_back' | 'selfie' | 'criminal_record' | 'driving_license';
          file_path?: string;
          verification_status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
      };
      strike_history: {
        Row: {
          id: string;
          worker_id: string;
          reason: string;
          issued_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          worker_id: string;
          reason: string;
          issued_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          worker_id?: string;
          reason?: string;
          issued_by?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          table_name: string;
          record_id: string;
          old_values: Json | null;
          new_values: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          table_name: string;
          record_id: string;
          old_values?: Json | null;
          new_values?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          table_name?: string;
          record_id?: string;
          old_values?: Json | null;
          new_values?: Json | null;
          created_at?: string;
        };
      };
      user_consents: {
        Row: {
          id: string;
          user_id: string;
          consent_type: 'terms' | 'privacy' | 'cookies';
          version: string;
          accepted: boolean;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          consent_type: 'terms' | 'privacy' | 'cookies';
          version: string;
          accepted: boolean;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          consent_type?: 'terms' | 'privacy' | 'cookies';
          version?: string;
          accepted?: boolean;
          accepted_at?: string | null;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          reviewee_id: string;
          reviewer_id: string;
          shift_id: string;
          rating: number;
          comment: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reviewee_id: string;
          reviewer_id: string;
          shift_id: string;
          rating: number;
          comment?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reviewee_id?: string;
          reviewer_id?: string;
          shift_id?: string;
          rating?: number;
          comment?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          application_id: string;
          shift_id: string;
          worker_id: string;
          company_id: string;
          amount: number;
          hourly_rate: number;
          hours_worked: number;
          shift_title_snapshot: string;
          worker_name_snapshot: string;
          payment_status: 'pending' | 'paid' | 'cancelled';
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          shift_id: string;
          worker_id: string;
          company_id: string;
          amount: number;
          hourly_rate: number;
          hours_worked: number;
          shift_title_snapshot: string;
          worker_name_snapshot: string;
          payment_status?: 'pending' | 'paid' | 'cancelled';
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          shift_id?: string;
          worker_id?: string;
          company_id?: string;
          amount?: number;
          hourly_rate?: number;
          hours_worked?: number;
          shift_title_snapshot?: string;
          worker_name_snapshot?: string;
          payment_status?: 'pending' | 'paid' | 'cancelled';
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      skills: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: 'language' | 'license';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: 'language' | 'license';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: 'language' | 'license';
          created_at?: string;
          updated_at?: string;
        };
      };
      worker_skills: {
        Row: {
          id: string;
          worker_id: string;
          skill_id: string;
          skill_name_debug: string | null;  // Auto-sync z skills.name via trigger
          proof_document_id: string | null;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          worker_id: string;
          skill_id: string;
          skill_name_debug?: string | null;  // Trigger wypełni automatycznie
          proof_document_id?: string | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          worker_id?: string;
          skill_id?: string;
          skill_name_debug?: string | null;
          proof_document_id?: string | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

