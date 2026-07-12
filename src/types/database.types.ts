export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      allocations: {
        Row: {
          allocated_at: string
          asset_id: string
          created_at: string
          department_id: string | null
          employee_id: string | null
          expected_return_date: string | null
          id: string
          return_condition_notes: string | null
          returned_at: string | null
          status: Database["public"]["Enums"]["allocation_status"]
          updated_at: string
        }
        Insert: {
          allocated_at?: string
          asset_id: string
          created_at?: string
          department_id?: string | null
          employee_id?: string | null
          expected_return_date?: string | null
          id?: string
          return_condition_notes?: string | null
          returned_at?: string | null
          status?: Database["public"]["Enums"]["allocation_status"]
          updated_at?: string
        }
        Update: {
          allocated_at?: string
          asset_id?: string
          created_at?: string
          department_id?: string | null
          employee_id?: string | null
          expected_return_date?: string | null
          id?: string
          return_condition_notes?: string | null
          returned_at?: string | null
          status?: Database["public"]["Enums"]["allocation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          code: string | null
          created_at: string
          extra_fields: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          extra_fields?: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          extra_fields?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          acquisition_cost: number | null
          acquisition_date: string | null
          asset_tag: string
          category_id: string
          condition: string
          created_at: string
          department_id: string | null
          document_urls: string[] | null
          id: string
          is_bookable: boolean
          location: string | null
          name: string
          photo_url: string | null
          qr_code: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status"]
          updated_at: string
        }
        Insert: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          asset_tag?: string
          category_id: string
          condition?: string
          created_at?: string
          department_id?: string | null
          document_urls?: string[] | null
          id?: string
          is_bookable?: boolean
          location?: string | null
          name: string
          photo_url?: string | null
          qr_code?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
        }
        Update: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          asset_tag?: string
          category_id?: string
          condition?: string
          created_at?: string
          department_id?: string | null
          document_urls?: string[] | null
          id?: string
          is_bookable?: boolean
          location?: string | null
          name?: string
          photo_url?: string | null
          qr_code?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_cycle_auditors: {
        Row: {
          audit_cycle_id: string
          employee_id: string
        }
        Insert: {
          audit_cycle_id: string
          employee_id: string
        }
        Update: {
          audit_cycle_id?: string
          employee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_cycle_auditors_audit_cycle_id_fkey"
            columns: ["audit_cycle_id"]
            isOneToOne: false
            referencedRelation: "audit_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_cycle_auditors_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_cycles: {
        Row: {
          closed_at: string | null
          created_at: string
          end_date: string
          id: string
          name: string
          scope_department_id: string | null
          scope_location: string | null
          start_date: string
          status: Database["public"]["Enums"]["audit_cycle_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          end_date: string
          id?: string
          name: string
          scope_department_id?: string | null
          scope_location?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["audit_cycle_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          scope_department_id?: string | null
          scope_location?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["audit_cycle_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_cycles_scope_department_id_fkey"
            columns: ["scope_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_items: {
        Row: {
          asset_id: string
          audit_cycle_id: string
          expected_location: string | null
          id: string
          notes: string | null
          verification: Database["public"]["Enums"]["audit_verification"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          asset_id: string
          audit_cycle_id: string
          expected_location?: string | null
          id?: string
          notes?: string | null
          verification?: Database["public"]["Enums"]["audit_verification"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          asset_id?: string
          audit_cycle_id?: string
          expected_location?: string | null
          id?: string
          notes?: string | null
          verification?: Database["public"]["Enums"]["audit_verification"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_items_audit_cycle_id_fkey"
            columns: ["audit_cycle_id"]
            isOneToOne: false
            referencedRelation: "audit_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_items_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          head_employee_id: string | null
          id: string
          name: string
          parent_department_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          head_employee_id?: string | null
          id?: string
          name: string
          parent_department_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          head_employee_id?: string | null
          id?: string
          name?: string
          parent_department_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_departments_head"
            columns: ["head_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          approved_by: string | null
          asset_id: string
          created_at: string
          id: string
          issue_description: string
          photo_url: string | null
          priority: Database["public"]["Enums"]["maintenance_priority"]
          raised_by: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          technician_name: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          asset_id: string
          created_at?: string
          id?: string
          issue_description: string
          photo_url?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          raised_by?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          technician_name?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          asset_id?: string
          created_at?: string
          id?: string
          issue_description?: string
          photo_url?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          raised_by?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          technician_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_bookings: {
        Row: {
          booked_by: string
          booked_for_department_id: string | null
          created_at: string
          ends_at: string
          id: string
          resource_asset_id: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          booked_by: string
          booked_for_department_id?: string | null
          created_at?: string
          ends_at: string
          id?: string
          resource_asset_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          booked_by?: string
          booked_for_department_id?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          resource_asset_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_bookings_booked_by_fkey"
            columns: ["booked_by"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_bookings_booked_for_department_id_fkey"
            columns: ["booked_for_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_bookings_resource_asset_id_fkey"
            columns: ["resource_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          allocation_id: string
          approved_by: string | null
          asset_id: string
          created_at: string
          from_employee_id: string | null
          id: string
          reason: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_employee_id: string
          updated_at: string
        }
        Insert: {
          allocation_id: string
          approved_by?: string | null
          asset_id: string
          created_at?: string
          from_employee_id?: string | null
          id?: string
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_employee_id: string
          updated_at?: string
        }
        Update: {
          allocation_id?: string
          approved_by?: string | null
          asset_id?: string
          created_at?: string
          from_employee_id?: string | null
          id?: string
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_employee_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_transfer: {
        Args: { p_approver_id: string; p_transfer_id: string }
        Returns: undefined
      }
      close_audit_cycle: { Args: { p_cycle_id: string }; Returns: undefined }
      current_employee: {
        Args: never
        Returns: {
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "employee_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_activity: {
        Args: {
          p_action: string
          p_actor_id: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      allocation_status: "Active" | "Returned" | "Transferred"
      asset_status:
        | "Available"
        | "Allocated"
        | "Reserved"
        | "Under Maintenance"
        | "Lost"
        | "Retired"
        | "Disposed"
      audit_cycle_status: "Open" | "Closed"
      audit_verification: "Pending" | "Verified" | "Missing" | "Damaged"
      booking_status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled"
      maintenance_priority: "Low" | "Medium" | "High" | "Critical"
      maintenance_status:
        | "Pending"
        | "Approved"
        | "Rejected"
        | "Technician Assigned"
        | "In Progress"
        | "Resolved"
      notification_type:
        | "Asset Assigned"
        | "Maintenance Approved"
        | "Maintenance Rejected"
        | "Booking Confirmed"
        | "Booking Cancelled"
        | "Booking Reminder"
        | "Transfer Approved"
        | "Overdue Return Alert"
        | "Audit Discrepancy Flagged"
      transfer_status: "Requested" | "Approved" | "Rejected" | "Reallocated"
      user_role: "Admin" | "Asset Manager" | "Department Head" | "Employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      allocation_status: ["Active", "Returned", "Transferred"],
      asset_status: [
        "Available",
        "Allocated",
        "Reserved",
        "Under Maintenance",
        "Lost",
        "Retired",
        "Disposed",
      ],
      audit_cycle_status: ["Open", "Closed"],
      audit_verification: ["Pending", "Verified", "Missing", "Damaged"],
      booking_status: ["Upcoming", "Ongoing", "Completed", "Cancelled"],
      maintenance_priority: ["Low", "Medium", "High", "Critical"],
      maintenance_status: [
        "Pending",
        "Approved",
        "Rejected",
        "Technician Assigned",
        "In Progress",
        "Resolved",
      ],
      notification_type: [
        "Asset Assigned",
        "Maintenance Approved",
        "Maintenance Rejected",
        "Booking Confirmed",
        "Booking Cancelled",
        "Booking Reminder",
        "Transfer Approved",
        "Overdue Return Alert",
        "Audit Discrepancy Flagged",
      ],
      transfer_status: ["Requested", "Approved", "Rejected", "Reallocated"],
      user_role: ["Admin", "Asset Manager", "Department Head", "Employee"],
    },
  },
} as const
