
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "cities": {
                  Row: {
                    "active": boolean,"country_id": string,"created_at": string,"id": string,"name": string,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"country_id": string,"created_at"?: string,"id"?: string,"name": string,"timezone"?: string
                  }
                  Update: {
                    "active"?: boolean,"country_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"timezone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cities_country_id_fkey"
      columns: ["country_id"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["id"]
    }
                  ]
                },"countries": {
                  Row: {
                    "active": boolean,"code": string,"created_at": string,"currency": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"code": string,"created_at"?: string,"currency": string,"id"?: string,"name": string
                  }
                  Update: {
                    "active"?: boolean,"code"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"delivery_slots": {
                  Row: {
                    "active": boolean,"created_at": string,"end_time": string,"id": string,"start_time": string,"zone_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"end_time": string,"id"?: string,"start_time": string,"zone_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"end_time"?: string,"id"?: string,"start_time"?: string,"zone_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_slots_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "zones"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"href": string | null,"id": string,"kind": string,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"created_at"?: string,"href"?: string | null,"id"?: string,"kind"?: string,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"href"?: string | null,"id"?: string,"kind"?: string,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"permissions": {
                  Row: {
                    "description": string,"key": string,"module": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"key": string,"module": string
                  }
                  Update: {
                    "description"?: string,"key"?: string,"module"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"role_permissions": {
                  Row: {
                    "permission_key": string,"role_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "permission_key": string,"role_id": string
                  }
                  Update: {
                    "permission_key"?: string,"role_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_permissions_permission_key_fkey"
      columns: ["permission_key"]
isOneToOne: false
      referencedRelation: "permissions"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "role_permissions_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"is_system": boolean,"key": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_system"?: boolean,"key": string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_system"?: boolean,"key"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"role_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"zones": {
                  Row: {
                    "active": boolean,"area": unknown,"city_id": string,"color": string,"created_at": string,"cutoff_time": string,"delivery_days": (number)[],"id": string,"name": string,"polygon": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"area"?: unknown,"city_id": string,"color"?: string,"created_at"?: string,"cutoff_time"?: string,"delivery_days"?: (number)[],"id"?: string,"name": string,"polygon"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"area"?: unknown,"city_id"?: string,"color"?: string,"created_at"?: string,"cutoff_time"?: string,"delivery_days"?: (number)[],"id"?: string,"name"?: string,"polygon"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "zones_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "has_permission":
{ Args: { "perm": string }; Returns: boolean
                           },
"is_staff_role":
{ Args: { "rid": string }; Returns: boolean
                           },
"my_permissions":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"zone_for_point":
{ Args: { "lat": number,"lng": number }; Returns: {
              "city_name": string,"country_code": string,"zone_id": string,"zone_name": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
