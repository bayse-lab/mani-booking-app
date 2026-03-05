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
          email: string;
          full_name: string | null;
          phone: string | null;
          role: 'member' | 'admin' | 'instructor';
          expo_push_token: string | null;
          center_id: string | null;
          birthday: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          postal_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role?: 'member' | 'admin' | 'instructor';
          expo_push_token?: string | null;
          center_id?: string | null;
          birthday?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          postal_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: 'member' | 'admin' | 'instructor';
          expo_push_token?: string | null;
          center_id?: string | null;
          birthday?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          postal_code?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_center_id_fkey';
            columns: ['center_id'];
            isOneToOne: false;
            referencedRelation: 'centers';
            referencedColumns: ['id'];
          },
        ];
      };
      centers: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          phone: string | null;
          email: string | null;
          is_active: boolean;
          reformer_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
          reformer_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
          reformer_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      instructor_centers: {
        Row: {
          instructor_id: string;
          center_id: string;
          created_at: string;
        };
        Insert: {
          instructor_id: string;
          center_id: string;
          created_at?: string;
        };
        Update: {
          instructor_id?: string;
          center_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'instructor_centers_instructor_id_fkey';
            columns: ['instructor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'instructor_centers_center_id_fkey';
            columns: ['center_id'];
            isOneToOne: false;
            referencedRelation: 'centers';
            referencedColumns: ['id'];
          },
        ];
      };
      class_definitions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          what: string | null;
          who: string | null;
          experience: string | null;
          bring: string | null;
          wear: string | null;
          duration_minutes: number;
          capacity: number;
          intensity: number;
          category: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          what?: string | null;
          who?: string | null;
          experience?: string | null;
          bring?: string | null;
          wear?: string | null;
          duration_minutes?: number;
          capacity?: number;
          intensity?: number;
          category?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          what?: string | null;
          who?: string | null;
          experience?: string | null;
          bring?: string | null;
          wear?: string | null;
          duration_minutes?: number;
          capacity?: number;
          intensity?: number;
          category?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      class_instances: {
        Row: {
          id: string;
          class_definition_id: string;
          center_id: string | null;
          instructor_name: string | null;
          start_time: string;
          end_time: string;
          capacity: number;
          spots_remaining: number;
          status: 'scheduled' | 'cancelled' | 'completed';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_definition_id: string;
          center_id?: string | null;
          instructor_name?: string | null;
          start_time: string;
          end_time: string;
          capacity: number;
          spots_remaining: number;
          status?: 'scheduled' | 'cancelled' | 'completed';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          class_definition_id?: string;
          center_id?: string | null;
          instructor_name?: string | null;
          start_time?: string;
          end_time?: string;
          capacity?: number;
          spots_remaining?: number;
          status?: 'scheduled' | 'cancelled' | 'completed';
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_instances_class_definition_id_fkey';
            columns: ['class_definition_id'];
            isOneToOne: false;
            referencedRelation: 'class_definitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_instances_center_id_fkey';
            columns: ['center_id'];
            isOneToOne: false;
            referencedRelation: 'centers';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          class_instance_id: string;
          status: 'confirmed' | 'cancelled' | 'late_cancelled' | 'no_show' | 'completed';
          booked_at: string;
          cancelled_at: string | null;
          checked_in_at: string | null;
          cancellation_type: 'standard' | 'late' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          class_instance_id: string;
          status?: 'confirmed' | 'cancelled' | 'late_cancelled' | 'no_show' | 'completed';
          booked_at?: string;
          cancelled_at?: string | null;
          checked_in_at?: string | null;
          cancellation_type?: 'standard' | 'late' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'confirmed' | 'cancelled' | 'late_cancelled' | 'no_show' | 'completed';
          cancelled_at?: string | null;
          checked_in_at?: string | null;
          cancellation_type?: 'standard' | 'late' | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_class_instance_id_fkey';
            columns: ['class_instance_id'];
            isOneToOne: false;
            referencedRelation: 'class_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      waitlist_entries: {
        Row: {
          id: string;
          user_id: string;
          class_instance_id: string;
          position: number;
          status: 'waiting' | 'offered' | 'promoted' | 'expired' | 'removed';
          offered_at: string | null;
          offer_expires_at: string | null;
          promoted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          class_instance_id: string;
          position: number;
          status?: 'waiting' | 'offered' | 'promoted' | 'expired' | 'removed';
          offered_at?: string | null;
          offer_expires_at?: string | null;
          promoted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          position?: number;
          status?: 'waiting' | 'offered' | 'promoted' | 'expired' | 'removed';
          offered_at?: string | null;
          offer_expires_at?: string | null;
          promoted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'waitlist_entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waitlist_entries_class_instance_id_fkey';
            columns: ['class_instance_id'];
            isOneToOne: false;
            referencedRelation: 'class_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          data: Json | null;
          is_sent: boolean;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          data?: Json | null;
          is_sent?: boolean;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          is_sent?: boolean;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      fn_book_class: {
        Args: { p_user_id: string; p_class_instance_id: string };
        Returns: Json;
      };
      fn_cancel_booking: {
        Args: { p_user_id: string; p_booking_id: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Center = Database['public']['Tables']['centers']['Row'];
export type InstructorCenter = Database['public']['Tables']['instructor_centers']['Row'];
export type ClassDefinition = Database['public']['Tables']['class_definitions']['Row'];
export type ClassInstance = Database['public']['Tables']['class_instances']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

// Joined types for queries
export type ClassInstanceWithDefinition = ClassInstance & {
  class_definitions: ClassDefinition;
  centers?: { name: string } | null;
};

export type BookingWithClass = Booking & {
  class_instances: ClassInstanceWithDefinition;
};

export type WaitlistEntryWithClass = WaitlistEntry & {
  class_instances: ClassInstanceWithDefinition;
};
