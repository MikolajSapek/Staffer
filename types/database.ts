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
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: 'worker' | 'company' | 'admin';
          email: string;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'worker' | 'company' | 'admin';
          email?: string;
          is_verified?: boolean;
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
          vacancies_total: number;
          vacancies_taken: number;
          requirements: Json;
          status: 'published' | 'full' | 'completed' | 'cancelled';
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
          vacancies_total: number;
          vacancies_taken?: number;
          requirements?: Json;
          status?: 'published' | 'full' | 'completed' | 'cancelled';
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
          vacancies_total?: number;
          vacancies_taken?: number;
          requirements?: Json;
          status?: 'published' | 'full' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
      };
      shift_applications: {
        Row: {
          id: string;
          shift_id: string;
          worker_id: string;
          status: 'pending' | 'accepted' | 'rejected' | 'waitlist';
          applied_at: string;
        };
        Insert: {
          id?: string;
          shift_id: string;
          worker_id: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'waitlist';
          applied_at?: string;
        };
        Update: {
          id?: string;
          shift_id?: string;
          worker_id?: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'waitlist';
          applied_at?: string;
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
    };
  };
}

