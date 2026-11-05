
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
            "addresses": {
                  Row: {
                    "address": string,"created_at": string,"details": string,"id": string,"is_default": boolean,"label": string,"lat": number,"lng": number,"updated_at": string,"user_id": string,"zone_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"created_at"?: string,"details"?: string,"id"?: string,"is_default"?: boolean,"label"?: string,"lat": number,"lng": number,"updated_at"?: string,"user_id"?: string,"zone_id"?: string | null
                  }
                  Update: {
                    "address"?: string,"created_at"?: string,"details"?: string,"id"?: string,"is_default"?: boolean,"label"?: string,"lat"?: number,"lng"?: number,"updated_at"?: string,"user_id"?: string,"zone_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "addresses_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "addresses_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "zones"
      referencedColumns: ["id"]
    }
                  ]
                },"builder_options": {
                  Row: {
                    "active": boolean,"allergens": (string)[],"created_at": string,"emoji": string,"id": string,"image_url": string | null,"ingredient_id": string | null,"layer": NonNullable<Json>,"name": string,"nutrition": NonNullable<Json>,"price": number,"quantity": number,"sort": number,"step": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"allergens"?: (string)[],"created_at"?: string,"emoji"?: string,"id"?: string,"image_url"?: string | null,"ingredient_id"?: string | null,"layer"?: NonNullable<Json>,"name": string,"nutrition"?: NonNullable<Json>,"price"?: number,"quantity"?: number,"sort"?: number,"step": string
                  }
                  Update: {
                    "active"?: boolean,"allergens"?: (string)[],"created_at"?: string,"emoji"?: string,"id"?: string,"image_url"?: string | null,"ingredient_id"?: string | null,"layer"?: NonNullable<Json>,"name"?: string,"nutrition"?: NonNullable<Json>,"price"?: number,"quantity"?: number,"sort"?: number,"step"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "builder_options_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    }
                  ]
                },"cities": {
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
                },"ingredient_categories": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"name": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"ingredients": {
                  Row: {
                    "active": boolean,"allergens": (string)[],"carbs": number,"category_id": string,"cost_per_unit": number,"created_at": string,"fat": number,"fiber": number,"id": string,"image_url": string | null,"kcal": number,"min_stock": number,"name": string,"protein": number,"stock": number,"unit": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"allergens"?: (string)[],"carbs"?: number,"category_id": string,"cost_per_unit"?: number,"created_at"?: string,"fat"?: number,"fiber"?: number,"id"?: string,"image_url"?: string | null,"kcal"?: number,"min_stock"?: number,"name": string,"protein"?: number,"stock"?: number,"unit": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"allergens"?: (string)[],"carbs"?: number,"category_id"?: string,"cost_per_unit"?: number,"created_at"?: string,"fat"?: number,"fiber"?: number,"id"?: string,"image_url"?: string | null,"kcal"?: number,"min_stock"?: number,"name"?: string,"protein"?: number,"stock"?: number,"unit"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingredients_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "ingredient_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_movements": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"ingredient_id": string,"kind": string,"note": string,"quantity": number,"reason": string | null,"unit_cost": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"ingredient_id": string,"kind": string,"note"?: string,"quantity": number,"reason"?: string | null,"unit_cost"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"ingredient_id"?: string,"kind"?: string,"note"?: string,"quantity"?: number,"reason"?: string | null,"unit_cost"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_movements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
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
                },"order_events": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"note": string,"order_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string,"order_id": string,"status": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string,"order_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "id": string,"line_total": number,"name": string,"options": NonNullable<Json>,"order_id": string,"plan_value": number | null,"product_id": string | null,"quantity": number,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"line_total": number,"name": string,"options"?: NonNullable<Json>,"order_id": string,"plan_value"?: number | null,"product_id"?: string | null,"quantity": number,"unit_price": number
                  }
                  Update: {
                    "id"?: string,"line_total"?: number,"name"?: string,"options"?: NonNullable<Json>,"order_id"?: string,"plan_value"?: number | null,"product_id"?: string | null,"quantity"?: number,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "address_id": string | null,"address_snapshot": NonNullable<Json>,"cancelled_at": string | null,"code": string,"contact_name": string,"contact_phone": string,"created_at": string,"delivery_date": string,"delivery_fee": number,"id": string,"kind": string,"notes": string,"paid_at": string | null,"payment_status": string,"slot_id": string,"slot_label": string,"status": string,"subscription_id": string | null,"subtotal": number,"total": number,"updated_at": string,"user_id": string,"zone_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_id"?: string | null,"address_snapshot": NonNullable<Json>,"cancelled_at"?: string | null,"code"?: string,"contact_name"?: string,"contact_phone"?: string,"created_at"?: string,"delivery_date": string,"delivery_fee"?: number,"id"?: string,"kind"?: string,"notes"?: string,"paid_at"?: string | null,"payment_status"?: string,"slot_id": string,"slot_label": string,"status"?: string,"subscription_id"?: string | null,"subtotal": number,"total": number,"updated_at"?: string,"user_id": string,"zone_id": string
                  }
                  Update: {
                    "address_id"?: string | null,"address_snapshot"?: NonNullable<Json>,"cancelled_at"?: string | null,"code"?: string,"contact_name"?: string,"contact_phone"?: string,"created_at"?: string,"delivery_date"?: string,"delivery_fee"?: number,"id"?: string,"kind"?: string,"notes"?: string,"paid_at"?: string | null,"payment_status"?: string,"slot_id"?: string,"slot_label"?: string,"status"?: string,"subscription_id"?: string | null,"subtotal"?: number,"total"?: number,"updated_at"?: string,"user_id"?: string,"zone_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_address_id_fkey"
      columns: ["address_id"]
isOneToOne: false
      referencedRelation: "addresses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_slot_id_fkey"
      columns: ["slot_id"]
isOneToOne: false
      referencedRelation: "delivery_slots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscription_usage"
      referencedColumns: ["subscription_id"]
    },{
      foreignKeyName: "orders_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "zones"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"order_id": string,"provider": string,"reference": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"order_id": string,"provider"?: string,"reference"?: string,"status": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"order_id"?: string,"provider"?: string,"reference"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
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
                },"product_categories": {
                  Row: {
                    "active": boolean,"created_at": string,"description": string,"id": string,"image_url": string | null,"name": string,"slug": string,"sort": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description"?: string,"id"?: string,"image_url"?: string | null,"name": string,"slug": string,"sort"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description"?: string,"id"?: string,"image_url"?: string | null,"name"?: string,"slug"?: string,"sort"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"allergens": (string)[],"category_id": string,"created_at": string,"description": string,"dietary_tags": (string)[],"featured": boolean,"id": string,"image_url": string | null,"kind": string,"name": string,"nutrition": NonNullable<Json>,"nutrition_manual": NonNullable<Json>,"nutrition_mode": string,"price": number,"slug": string,"sort": number,"tag": string | null,"target_margin": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"allergens"?: (string)[],"category_id": string,"created_at"?: string,"description"?: string,"dietary_tags"?: (string)[],"featured"?: boolean,"id"?: string,"image_url"?: string | null,"kind"?: string,"name": string,"nutrition"?: NonNullable<Json>,"nutrition_manual"?: NonNullable<Json>,"nutrition_mode"?: string,"price"?: number,"slug": string,"sort"?: number,"tag"?: string | null,"target_margin"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"allergens"?: (string)[],"category_id"?: string,"created_at"?: string,"description"?: string,"dietary_tags"?: (string)[],"featured"?: boolean,"id"?: string,"image_url"?: string | null,"kind"?: string,"name"?: string,"nutrition"?: NonNullable<Json>,"nutrition_manual"?: NonNullable<Json>,"nutrition_mode"?: string,"price"?: number,"slug"?: string,"sort"?: number,"tag"?: string | null,"target_margin"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "product_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"marketing_opt_in": boolean,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"marketing_opt_in"?: boolean,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"marketing_opt_in"?: boolean,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recipe_items": {
                  Row: {
                    "ingredient_id": string,"product_id": string,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ingredient_id": string,"product_id": string,"quantity": number
                  }
                  Update: {
                    "ingredient_id"?: string,"product_id"?: string,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_items_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "recipe_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
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
                },"settings": {
                  Row: {
                    "description": string,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"subscription_payments": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"kind": string,"order_id": string | null,"provider": string,"reference": string,"status": string,"subscription_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"kind": string,"order_id"?: string | null,"provider"?: string,"reference"?: string,"status": string,"subscription_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"kind"?: string,"order_id"?: string | null,"provider"?: string,"reference"?: string,"status"?: string,"subscription_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscription_payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscription_payments_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscription_usage"
      referencedColumns: ["subscription_id"]
    },{
      foreignKeyName: "subscription_payments_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"subscription_plans": {
                  Row: {
                    "active": boolean,"benefits": (string)[],"created_at": string,"description": string,"discount": number,"featured": boolean,"id": string,"name": string,"portions": number,"slug": string,"sort": number,"updated_at": string,"validity_days": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"benefits"?: (string)[],"created_at"?: string,"description"?: string,"discount"?: number,"featured"?: boolean,"id"?: string,"name": string,"portions": number,"slug": string,"sort"?: number,"updated_at"?: string,"validity_days"?: number
                  }
                  Update: {
                    "active"?: boolean,"benefits"?: (string)[],"created_at"?: string,"description"?: string,"discount"?: number,"featured"?: boolean,"id"?: string,"name"?: string,"portions"?: number,"slug"?: string,"sort"?: number,"updated_at"?: string,"validity_days"?: number
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "base_value": number,"code": string,"created_at": string,"discount": number,"expires_on": string,"id": string,"paid_at": string | null,"payment_status": string,"plan_id": string | null,"plan_name": string,"portions": number,"starts_on": string,"status": string,"total": number,"updated_at": string,"user_id": string,"validity_days": number
                  }
                  ComputedFields: never
                  Insert: {
                    "base_value": number,"code"?: string,"created_at"?: string,"discount": number,"expires_on": string,"id"?: string,"paid_at"?: string | null,"payment_status"?: string,"plan_id"?: string | null,"plan_name": string,"portions": number,"starts_on": string,"status"?: string,"total": number,"updated_at"?: string,"user_id": string,"validity_days": number
                  }
                  Update: {
                    "base_value"?: number,"code"?: string,"created_at"?: string,"discount"?: number,"expires_on"?: string,"id"?: string,"paid_at"?: string | null,"payment_status"?: string,"plan_id"?: string | null,"plan_name"?: string,"portions"?: number,"starts_on"?: string,"status"?: string,"total"?: number,"updated_at"?: string,"user_id"?: string,"validity_days"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "subscription_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_consents": {
                  Row: {
                    "accepted": boolean,"created_at": string,"document": string,"id": string,"ip": string | null,"method": string,"user_agent": string | null,"user_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted"?: boolean,"created_at"?: string,"document": string,"id"?: string,"ip"?: string | null,"method": string,"user_agent"?: string | null,"user_id"?: string,"version": string
                  }
                  Update: {
                    "accepted"?: boolean,"created_at"?: string,"document"?: string,"id"?: string,"ip"?: string | null,"method"?: string,"user_agent"?: string | null,"user_id"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
            "product_costs": {
                  Row: {
                    "cost": number | null,"product_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"subscription_usage": {
                  Row: {
                    "delivered_portions": number | null,"deliveries": number | null,"subscription_id": string,"used_portions": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "cancel_my_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"cancel_my_subscription":
{ Args: { "p_subscription_id": string }; Returns: undefined
                           },
"cancel_subscription_delivery":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"create_plan_order":
{ Args: { "p_delivery": Json,"p_payment_status": string,"p_status": string,"p_sub": Omit<Database["public"]['Tables']["subscriptions"]['Row'], Database["public"]['Tables']["subscriptions"]['ComputedFields']> }; Returns: {
              "order_code": string,"order_id": string,"portions": number,"value_sum": number
            }[]
                           },
"delivery_date_allowed":
{ Args: { "p_date": string,"p_zone_id": string }; Returns: boolean
                           },
"delivery_date_open":
{ Args: { "p_date": string,"p_zone_id": string }; Returns: boolean
                           },
"has_permission":
{ Args: { "perm": string }; Returns: boolean
                           },
"is_staff_role":
{ Args: { "rid": string }; Returns: boolean
                           },
"my_active_subscription":
{ Args: { "p_subscription_id": string }; Returns: {
              "base_value": number,
"code": string,
"created_at": string,
"discount": number,
"expires_on": string,
"id": string,
"paid_at": string | null,
"payment_status": string,
"plan_id": string | null,
"plan_name": string,
"portions": number,
"starts_on": string,
"status": string,
"total": number,
"updated_at": string,
"user_id": string,
"validity_days": number
            }
                          SetofOptions: {
        from: "*"
        to: "subscriptions"
        isOneToOne: true
        isSetofReturn: false
      } },
"my_permissions":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"notify_permission":
{ Args: { "p_body": string,"p_href": string,"p_kind": string,"p_title": string,"perm": string }; Returns: undefined
                           },
"pay_order_simulated":
{ Args: { "p_approve": boolean,"p_order_id": string }; Returns: string
                           },
"pay_subscription_simulated":
{ Args: { "p_approve": boolean,"p_subscription_id": string }; Returns: string
                           },
"place_order":
{ Args: { "p_address_id": string,"p_date": string,"p_items": Json,"p_notes"?: string,"p_slot_id": string }; Returns: {
              "order_code": string,"order_id": string
            }[]
                           },
"purchase_subscription":
{ Args: { "p_deliveries": Json,"p_plan_id": string }; Returns: {
              "subscription_code": string,"subscription_id": string
            }[]
                           },
"recompute_nutrition":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"resolve_plan_delivery":
{ Args: { "p_delivery": Json,"p_last_day": string,"p_uid": string }; Returns: {
              "address_id": string,"address_snapshot": Json,"delivery_date": string,"notes": string,"slot_id": string,"slot_label": string,"zone_id": string
            }[]
                           },
"resolve_plan_items":
{ Args: { "p_base": number,"p_items": Json }; Returns: {
              "name": string,"options": Json,"plan_value": number,"product_id": string,"quantity": number,"unit_price": number
            }[]
                           },
"schedule_subscription_delivery":
{ Args: { "p_delivery": Json,"p_pay"?: boolean,"p_subscription_id": string }; Returns: {
              "charged": number,"order_code": string,"order_id": string
            }[]
                           },
"set_order_status":
{ Args: { "p_note"?: string,"p_order_id": string,"p_status": string }; Returns: undefined
                           },
"subscription_change_quote":
{ Args: { "p_items": Json,"p_order_id": string,"p_subscription_id": string }; Returns: number
                           },
"subscription_used_portions":
{ Args: { "p_subscription_id": string }; Returns: number
                           },
"sync_builder_option_images":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"today_local":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"update_subscription_delivery":
{ Args: { "p_delivery": Json,"p_order_id": string,"p_pay"?: boolean }; Returns: number
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
