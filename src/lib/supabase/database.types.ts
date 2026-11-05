
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
                },"courier_assignments": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"slot_id": string | null,"user_id": string,"zone_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"slot_id"?: string | null,"user_id": string,"zone_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"slot_id"?: string | null,"user_id"?: string,"zone_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "courier_assignments_slot_id_fkey"
      columns: ["slot_id"]
isOneToOne: false
      referencedRelation: "delivery_slots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "courier_assignments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "courier_assignments_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "zones"
      referencedColumns: ["id"]
    }
                  ]
                },"delivery_routes": {
                  Row: {
                    "completed_at": string | null,"courier_id": string | null,"created_at": string,"delivery_date": string,"distance_m": number,"duration_s": number,"id": string,"kitchen_id": string,"method": string,"packing_started_at": string | null,"polyline": string | null,"returned_at": string | null,"returned_by": string | null,"slot_id": string,"started_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"courier_id"?: string | null,"created_at"?: string,"delivery_date": string,"distance_m"?: number,"duration_s"?: number,"id"?: string,"kitchen_id": string,"method"?: string,"packing_started_at"?: string | null,"polyline"?: string | null,"returned_at"?: string | null,"returned_by"?: string | null,"slot_id": string,"started_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"courier_id"?: string | null,"created_at"?: string,"delivery_date"?: string,"distance_m"?: number,"duration_s"?: number,"id"?: string,"kitchen_id"?: string,"method"?: string,"packing_started_at"?: string | null,"polyline"?: string | null,"returned_at"?: string | null,"returned_by"?: string | null,"slot_id"?: string,"started_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_routes_courier_id_fkey"
      columns: ["courier_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_routes_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_routes_returned_by_fkey"
      columns: ["returned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_routes_slot_id_fkey"
      columns: ["slot_id"]
isOneToOne: false
      referencedRelation: "delivery_slots"
      referencedColumns: ["id"]
    }
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
                },"kitchens": {
                  Row: {
                    "active": boolean,"address": string,"created_at": string,"id": string,"lat": number,"lng": number,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"address"?: string,"created_at"?: string,"id"?: string,"lat": number,"lng": number,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"address"?: string,"created_at"?: string,"id"?: string,"lat"?: number,"lng"?: number,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
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
                },"order_incidents": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"item_name": string | null,"note": string,"order_id": string,"order_item_id": string | null,"photo_path": string | null,"quantity": number | null,"reason": string,"resolution": string | null,"resolved_at": string | null,"resolved_by": string | null,"route_id": string | null,"stage": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"item_name"?: string | null,"note": string,"order_id": string,"order_item_id"?: string | null,"photo_path"?: string | null,"quantity"?: number | null,"reason": string,"resolution"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"route_id"?: string | null,"stage"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"item_name"?: string | null,"note"?: string,"order_id"?: string,"order_item_id"?: string | null,"photo_path"?: string | null,"quantity"?: number | null,"reason"?: string,"resolution"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"route_id"?: string | null,"stage"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_incidents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_incidents_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_incidents_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_incidents_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_incidents_route_id_fkey"
      columns: ["route_id"]
isOneToOne: false
      referencedRelation: "delivery_routes"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "id": string,"line_total": number,"name": string,"options": NonNullable<Json>,"order_id": string,"plan_value": number | null,"prepared_at": string | null,"prepared_qty": number,"product_id": string | null,"quantity": number,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"line_total": number,"name": string,"options"?: NonNullable<Json>,"order_id": string,"plan_value"?: number | null,"prepared_at"?: string | null,"prepared_qty"?: number,"product_id"?: string | null,"quantity": number,"unit_price": number
                  }
                  Update: {
                    "id"?: string,"line_total"?: number,"name"?: string,"options"?: NonNullable<Json>,"order_id"?: string,"plan_value"?: number | null,"prepared_at"?: string | null,"prepared_qty"?: number,"product_id"?: string | null,"quantity"?: number,"unit_price"?: number
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
                    "address_id": string | null,"address_snapshot": NonNullable<Json>,"cancelled_at": string | null,"code": string,"contact_name": string,"contact_phone": string,"created_at": string,"delivered_at": string | null,"delivered_by": string | null,"delivery_date": string,"delivery_fee": number,"delivery_photo_path": string | null,"id": string,"kind": string,"notes": string,"on_hold": boolean,"packed_at": string | null,"packed_by": string | null,"paid_at": string | null,"payment_status": string,"prepared_at": string | null,"slot_id": string,"slot_label": string,"status": string,"subscription_id": string | null,"subtotal": number,"total": number,"updated_at": string,"user_id": string,"zone_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_id"?: string | null,"address_snapshot": NonNullable<Json>,"cancelled_at"?: string | null,"code"?: string,"contact_name"?: string,"contact_phone"?: string,"created_at"?: string,"delivered_at"?: string | null,"delivered_by"?: string | null,"delivery_date": string,"delivery_fee"?: number,"delivery_photo_path"?: string | null,"id"?: string,"kind"?: string,"notes"?: string,"on_hold"?: boolean,"packed_at"?: string | null,"packed_by"?: string | null,"paid_at"?: string | null,"payment_status"?: string,"prepared_at"?: string | null,"slot_id": string,"slot_label": string,"status"?: string,"subscription_id"?: string | null,"subtotal": number,"total": number,"updated_at"?: string,"user_id": string,"zone_id": string
                  }
                  Update: {
                    "address_id"?: string | null,"address_snapshot"?: NonNullable<Json>,"cancelled_at"?: string | null,"code"?: string,"contact_name"?: string,"contact_phone"?: string,"created_at"?: string,"delivered_at"?: string | null,"delivered_by"?: string | null,"delivery_date"?: string,"delivery_fee"?: number,"delivery_photo_path"?: string | null,"id"?: string,"kind"?: string,"notes"?: string,"on_hold"?: boolean,"packed_at"?: string | null,"packed_by"?: string | null,"paid_at"?: string | null,"payment_status"?: string,"prepared_at"?: string | null,"slot_id"?: string,"slot_label"?: string,"status"?: string,"subscription_id"?: string | null,"subtotal"?: number,"total"?: number,"updated_at"?: string,"user_id"?: string,"zone_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_address_id_fkey"
      columns: ["address_id"]
isOneToOne: false
      referencedRelation: "addresses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_delivered_by_fkey"
      columns: ["delivered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_packed_by_fkey"
      columns: ["packed_by"]
isOneToOne: false
      referencedRelation: "profiles"
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
                },"prep_batch_items": {
                  Row: {
                    "batch_id": string,"order_item_id": string,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"order_item_id": string,"quantity": number
                  }
                  Update: {
                    "batch_id"?: string,"order_item_id"?: string,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "prep_batch_items_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "prep_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prep_batch_items_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"prep_batches": {
                  Row: {
                    "delivery_date": string,"duration_seconds": number | null,"finished_at": string | null,"finished_by": string | null,"id": string,"kind": string,"kitchen_id": string,"name": string,"product_id": string | null,"quantity": number,"slot_id": string,"started_at": string,"started_by": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "delivery_date": string,"duration_seconds"?: number | null,"finished_at"?: string | null,"finished_by"?: string | null,"id"?: string,"kind": string,"kitchen_id": string,"name": string,"product_id"?: string | null,"quantity": number,"slot_id": string,"started_at"?: string,"started_by"?: string | null,"status"?: string
                  }
                  Update: {
                    "delivery_date"?: string,"duration_seconds"?: number | null,"finished_at"?: string | null,"finished_by"?: string | null,"id"?: string,"kind"?: string,"kitchen_id"?: string,"name"?: string,"product_id"?: string | null,"quantity"?: number,"slot_id"?: string,"started_at"?: string,"started_by"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "prep_batches_finished_by_fkey"
      columns: ["finished_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prep_batches_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prep_batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "prep_batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prep_batches_slot_id_fkey"
      columns: ["slot_id"]
isOneToOne: false
      referencedRelation: "delivery_slots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prep_batches_started_by_fkey"
      columns: ["started_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                    "active": boolean,"avatar_url": string | null,"created_at": string,"deactivated_at": string | null,"deactivated_by": string | null,"deactivation_reason": string | null,"email": string | null,"full_name": string,"id": string,"marketing_opt_in": boolean,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"avatar_url"?: string | null,"created_at"?: string,"deactivated_at"?: string | null,"deactivated_by"?: string | null,"deactivation_reason"?: string | null,"email"?: string | null,"full_name"?: string,"id": string,"marketing_opt_in"?: boolean,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"avatar_url"?: string | null,"created_at"?: string,"deactivated_at"?: string | null,"deactivated_by"?: string | null,"deactivation_reason"?: string | null,"email"?: string | null,"full_name"?: string,"id"?: string,"marketing_opt_in"?: boolean,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_deactivated_by_fkey"
      columns: ["deactivated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                },"route_stops": {
                  Row: {
                    "added_late": boolean,"arrived_at": string | null,"eta": string | null,"order_id": string,"position": number,"route_id": string,"seq": number,"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "added_late"?: boolean,"arrived_at"?: string | null,"eta"?: string | null,"order_id": string,"position": number,"route_id": string,"seq": number,"verified_at"?: string | null
                  }
                  Update: {
                    "added_late"?: boolean,"arrived_at"?: string | null,"eta"?: string | null,"order_id"?: string,"position"?: number,"route_id"?: string,"seq"?: number,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "route_stops_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "route_stops_route_id_fkey"
      columns: ["route_id"]
isOneToOne: false
      referencedRelation: "delivery_routes"
      referencedColumns: ["id"]
    }
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
                },"user_status_events": {
                  Row: {
                    "active": boolean,"created_at": string,"created_by": string | null,"id": string,"reason": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active": boolean,"created_at"?: string,"created_by"?: string | null,"id"?: string,"reason"?: string,"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"id"?: string,"reason"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_status_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_status_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"zones": {
                  Row: {
                    "active": boolean,"area": unknown,"city_id": string,"color": string,"created_at": string,"cutoff_time": string,"delivery_days": (number)[],"id": string,"kitchen_id": string | null,"name": string,"polygon": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"area"?: unknown,"city_id": string,"color"?: string,"created_at"?: string,"cutoff_time"?: string,"delivery_days"?: (number)[],"id"?: string,"kitchen_id"?: string | null,"name": string,"polygon"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"area"?: unknown,"city_id"?: string,"color"?: string,"created_at"?: string,"cutoff_time"?: string,"delivery_days"?: (number)[],"id"?: string,"kitchen_id"?: string | null,"name"?: string,"polygon"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "zones_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "zones_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "prep_stats": {
                  Row: {
                    "batches": number | null,"kind": string,"product_id": string | null,"seconds_per_unit": number | null,"units": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "prep_batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "prep_batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_costs": {
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
            "add_order_to_route":
{ Args: { "p_after_seq": number,"p_eta": string,"p_extra_m": number,"p_extra_s": number,"p_order_id": string,"p_route_id": string }; Returns: number
                           },
"admin_user_auth":
{ Args: { "p_user_id": string }; Returns: {
              "email_confirmed_at": string,"last_sign_in_at": string,"providers": (string)[]
            }[]
                           },
"can_pack_route":
{ Args: { "p_route_id": string }; Returns: boolean
                           },
"cancel_my_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"cancel_my_subscription":
{ Args: { "p_subscription_id": string }; Returns: undefined
                           },
"cancel_prep_batch":
{ Args: { "p_batch_id": string }; Returns: undefined
                           },
"cancel_subscription_delivery":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"close_kitchen_slot":
{ Args: { "p_date": string,"p_kitchen_id": string,"p_note": string,"p_reason": string,"p_slot_id": string }; Returns: number
                           },
"complete_route_if_done":
{ Args: { "p_route_id": string }; Returns: undefined
                           },
"courier_busy":
{ Args: { "p_courier_id": string,"p_date": string,"p_except"?: string,"p_slot_id": string }; Returns: boolean
                           },
"create_plan_order":
{ Args: { "p_delivery": Json,"p_payment_status": string,"p_status": string,"p_sub": Omit<Database["public"]['Tables']["subscriptions"]['Row'], Database["public"]['Tables']["subscriptions"]['ComputedFields']> }; Returns: {
              "order_code": string,"order_id": string,"portions": number,"value_sum": number
            }[]
                           },
"deliver_order":
{ Args: { "p_order_id": string,"p_photo_path": string }; Returns: undefined
                           },
"delivery_date_allowed":
{ Args: { "p_date": string,"p_zone_id": string }; Returns: boolean
                           },
"delivery_date_open":
{ Args: { "p_date": string,"p_zone_id": string }; Returns: boolean
                           },
"delivery_wait_minutes":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"finish_prep_batch":
{ Args: { "p_batch_id": string }; Returns: number
                           },
"has_permission":
{ Args: { "perm": string }; Returns: boolean
                           },
"incident_reason_label":
{ Args: { "p_reason": string }; Returns: string
                           },
"is_staff_role":
{ Args: { "rid": string }; Returns: boolean
                           },
"item_in_progress":
{ Args: { "p_order_item_id": string }; Returns: number
                           },
"kitchen_orders":
{ Args: { "p_date": string,"p_kitchen_id": string,"p_slot_id": string }; Returns: {
              "address_id": string | null,
"address_snapshot": NonNullable<Json>,
"cancelled_at": string | null,
"code": string,
"contact_name": string,
"contact_phone": string,
"created_at": string,
"delivered_at": string | null,
"delivered_by": string | null,
"delivery_date": string,
"delivery_fee": number,
"delivery_photo_path": string | null,
"id": string,
"kind": string,
"notes": string,
"on_hold": boolean,
"packed_at": string | null,
"packed_by": string | null,
"paid_at": string | null,
"payment_status": string,
"prepared_at": string | null,
"slot_id": string,
"slot_label": string,
"status": string,
"subscription_id": string | null,
"subtotal": number,
"total": number,
"updated_at": string,
"user_id": string,
"zone_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: false
        isSetofReturn: true
      } },
"lock_route_packing":
{ Args: { "p_route_id": string }; Returns: undefined
                           },
"mark_arrived":
{ Args: { "p_order_id": string }; Returns: string
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
"pack_order":
{ Args: { "p_order_id": string,"p_packed"?: boolean }; Returns: undefined
                           },
"pack_route_orders":
{ Args: { "p_route_id": string }; Returns: number
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
"record_routing_factor":
{ Args: { "p_measured": number }; Returns: number
                           },
"report_delivery_incident":
{ Args: { "p_note": string,"p_order_id": string,"p_photo_path"?: string,"p_reason": string }; Returns: undefined
                           },
"report_kitchen_incident":
{ Args: { "p_note": string,"p_order_item_id": string,"p_quantity": number,"p_reason": string }; Returns: undefined
                           },
"report_packing_incident":
{ Args: { "p_note": string,"p_order_id": string,"p_reason": string }; Returns: undefined
                           },
"resolve_order_incident":
{ Args: { "p_note"?: string,"p_order_id": string,"p_resolution": string }; Returns: undefined
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
"return_to_kitchen":
{ Args: { "p_route_id": string }; Returns: undefined
                           },
"route_kitchen_pending":
{ Args: { "p_route_id": string }; Returns: number
                           },
"save_delivery_routes":
{ Args: { "p_date": string,"p_kitchen_id": string,"p_routes": Json,"p_slot_id": string }; Returns: number
                           },
"schedule_subscription_delivery":
{ Args: { "p_delivery": Json,"p_pay"?: boolean,"p_subscription_id": string }; Returns: {
              "charged": number,"order_code": string,"order_id": string
            }[]
                           },
"set_delivery_wait_minutes":
{ Args: { "p_minutes": number }; Returns: undefined
                           },
"set_order_status":
{ Args: { "p_note"?: string,"p_order_id": string,"p_status": string }; Returns: undefined
                           },
"set_route_courier":
{ Args: { "p_courier_id": string,"p_route_id": string }; Returns: boolean
                           },
"set_user_active":
{ Args: { "p_active": boolean,"p_reason"?: string,"p_user_id": string }; Returns: undefined
                           },
"start_delivery_route":
{ Args: { "p_route_id": string }; Returns: undefined
                           },
"start_prep_batch":
{ Args: { "p_date": string,"p_kitchen_id": string,"p_order_item_id"?: string,"p_product_id": string,"p_slot_id": string }; Returns: string
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
"verify_route_all":
{ Args: { "p_route_id": string }; Returns: number
                           },
"verify_route_stop":
{ Args: { "p_ok"?: boolean,"p_order_id": string }; Returns: undefined
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
