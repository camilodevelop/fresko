
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
                },"cash_sessions": {
                  Row: {
                    "cash_out": number,"closed_at": string | null,"closed_by": string | null,"counted_cash": number | null,"difference": number | null,"expected_cash": number | null,"id": string,"kitchen_id": string,"note": string,"opened_at": string,"opening_amount": number,"point_id": string | null,"totals": Json | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cash_out"?: number,"closed_at"?: string | null,"closed_by"?: string | null,"counted_cash"?: number | null,"difference"?: number | null,"expected_cash"?: number | null,"id"?: string,"kitchen_id": string,"note"?: string,"opened_at"?: string,"opening_amount"?: number,"point_id"?: string | null,"totals"?: Json | null,"user_id": string
                  }
                  Update: {
                    "cash_out"?: number,"closed_at"?: string | null,"closed_by"?: string | null,"counted_cash"?: number | null,"difference"?: number | null,"expected_cash"?: number | null,"id"?: string,"kitchen_id"?: string,"note"?: string,"opened_at"?: string,"opening_amount"?: number,"point_id"?: string | null,"totals"?: Json | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_sessions_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_sessions_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_sessions_point_id_fkey"
      columns: ["point_id"]
isOneToOne: false
      referencedRelation: "sale_points"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
                },"dish_lots": {
                  Row: {
                    "batch_id": string | null,"created_at": string,"expires_at": string,"id": string,"kitchen_id": string,"load_id": string | null,"produced_at": string,"product_id": string,"unit_cost": number
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id"?: string | null,"created_at"?: string,"expires_at": string,"id"?: string,"kitchen_id": string,"load_id"?: string | null,"produced_at"?: string,"product_id": string,"unit_cost"?: number
                  }
                  Update: {
                    "batch_id"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"kitchen_id"?: string,"load_id"?: string | null,"produced_at"?: string,"product_id"?: string,"unit_cost"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "dish_lots_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "prep_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_lots_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_lots_load_id_fkey"
      columns: ["load_id"]
isOneToOne: false
      referencedRelation: "point_loads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_lots_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "dish_lots_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"dish_movements": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"kind": string,"load_id": string | null,"location": string,"lot_id": string,"note": string,"order_item_id": string | null,"point_id": string | null,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": string,"load_id"?: string | null,"location": string,"lot_id": string,"note"?: string,"order_item_id"?: string | null,"point_id"?: string | null,"quantity": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: string,"load_id"?: string | null,"location"?: string,"lot_id"?: string,"note"?: string,"order_item_id"?: string | null,"point_id"?: string | null,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "dish_movements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_movements_load_id_fkey"
      columns: ["load_id"]
isOneToOne: false
      referencedRelation: "point_loads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_movements_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "dish_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_movements_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_movements_point_id_fkey"
      columns: ["point_id"]
isOneToOne: false
      referencedRelation: "sale_points"
      referencedColumns: ["id"]
    }
                  ]
                },"employee_pay": {
                  Row: {
                    "active": boolean,"amount": number,"kitchen_id": string | null,"pay_type": string,"starts_on": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"amount": number,"kitchen_id"?: string | null,"pay_type": string,"starts_on"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"amount"?: number,"kitchen_id"?: string | null,"pay_type"?: string,"starts_on"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "employee_pay_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employee_pay_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"finance_entries": {
                  Row: {
                    "amount": number,"category": string,"created_at": string,"created_by": string | null,"description": string,"ends_on": string | null,"entry_date": string,"id": string,"kind": string,"kitchen_id": string | null,"recurring": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category": string,"created_at"?: string,"created_by"?: string | null,"description": string,"ends_on"?: string | null,"entry_date": string,"id"?: string,"kind": string,"kitchen_id"?: string | null,"recurring"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"category"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"ends_on"?: string | null,"entry_date"?: string,"id"?: string,"kind"?: string,"kitchen_id"?: string | null,"recurring"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "finance_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_entries_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
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
                    "batch_id": string | null,"counterpart_kitchen_id": string | null,"created_at": string,"created_by": string | null,"id": string,"ingredient_id": string,"kind": string,"kitchen_id": string,"note": string,"quantity": number,"reason": string | null,"transfer_id": string | null,"unit_cost": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id"?: string | null,"counterpart_kitchen_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"ingredient_id": string,"kind": string,"kitchen_id": string,"note"?: string,"quantity": number,"reason"?: string | null,"transfer_id"?: string | null,"unit_cost"?: number | null
                  }
                  Update: {
                    "batch_id"?: string | null,"counterpart_kitchen_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"ingredient_id"?: string,"kind"?: string,"kitchen_id"?: string,"note"?: string,"quantity"?: number,"reason"?: string | null,"transfer_id"?: string | null,"unit_cost"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_movements_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "prep_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_counterpart_kitchen_id_fkey"
      columns: ["counterpart_kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    },{
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
    },{
      foreignKeyName: "inventory_movements_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    }
                  ]
                },"kitchen_stock": {
                  Row: {
                    "cost_per_unit": number,"ingredient_id": string,"kitchen_id": string,"min_stock": number,"stock": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cost_per_unit"?: number,"ingredient_id": string,"kitchen_id": string,"min_stock"?: number,"stock"?: number,"updated_at"?: string
                  }
                  Update: {
                    "cost_per_unit"?: number,"ingredient_id"?: string,"kitchen_id"?: string,"min_stock"?: number,"stock"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "kitchen_stock_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kitchen_stock_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
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
                    "cost": number,"created_at": string,"created_by": string | null,"id": string,"item_name": string | null,"note": string,"order_id": string,"order_item_id": string | null,"photo_path": string | null,"quantity": number | null,"reason": string,"resolution": string | null,"resolved_at": string | null,"resolved_by": string | null,"route_id": string | null,"stage": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cost"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"item_name"?: string | null,"note": string,"order_id": string,"order_item_id"?: string | null,"photo_path"?: string | null,"quantity"?: number | null,"reason": string,"resolution"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"route_id"?: string | null,"stage"?: string
                  }
                  Update: {
                    "cost"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"item_name"?: string | null,"note"?: string,"order_id"?: string,"order_item_id"?: string | null,"photo_path"?: string | null,"quantity"?: number | null,"reason"?: string,"resolution"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"route_id"?: string | null,"stage"?: string
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
                    "address_id": string | null,"address_snapshot": Json | null,"cancelled_at": string | null,"cash_session_id": string | null,"channel": string,"code": string,"contact_name": string,"contact_phone": string,"created_at": string,"created_by": string | null,"delivered_at": string | null,"delivered_by": string | null,"delivery_date": string,"delivery_fee": number,"delivery_photo_path": string | null,"id": string,"kind": string,"kitchen_id": string | null,"notes": string,"on_hold": boolean,"packed_at": string | null,"packed_by": string | null,"paid_at": string | null,"payment_status": string,"point_id": string | null,"prepared_at": string | null,"slot_id": string | null,"slot_label": string,"source": string,"status": string,"subscription_id": string | null,"subtotal": number,"tax_amount": number,"tax_name": string | null,"tax_rate": number,"total": number,"updated_at": string,"user_id": string | null,"zone_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_id"?: string | null,"address_snapshot"?: Json | null,"cancelled_at"?: string | null,"cash_session_id"?: string | null,"channel"?: string,"code"?: string,"contact_name"?: string,"contact_phone"?: string,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string | null,"delivered_by"?: string | null,"delivery_date": string,"delivery_fee"?: number,"delivery_photo_path"?: string | null,"id"?: string,"kind"?: string,"kitchen_id"?: string | null,"notes"?: string,"on_hold"?: boolean,"packed_at"?: string | null,"packed_by"?: string | null,"paid_at"?: string | null,"payment_status"?: string,"point_id"?: string | null,"prepared_at"?: string | null,"slot_id"?: string | null,"slot_label"?: string,"source"?: string,"status"?: string,"subscription_id"?: string | null,"subtotal": number,"tax_amount"?: number,"tax_name"?: string | null,"tax_rate"?: number,"total": number,"updated_at"?: string,"user_id"?: string | null,"zone_id"?: string | null
                  }
                  Update: {
                    "address_id"?: string | null,"address_snapshot"?: Json | null,"cancelled_at"?: string | null,"cash_session_id"?: string | null,"channel"?: string,"code"?: string,"contact_name"?: string,"contact_phone"?: string,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string | null,"delivered_by"?: string | null,"delivery_date"?: string,"delivery_fee"?: number,"delivery_photo_path"?: string | null,"id"?: string,"kind"?: string,"kitchen_id"?: string | null,"notes"?: string,"on_hold"?: boolean,"packed_at"?: string | null,"packed_by"?: string | null,"paid_at"?: string | null,"payment_status"?: string,"point_id"?: string | null,"prepared_at"?: string | null,"slot_id"?: string | null,"slot_label"?: string,"source"?: string,"status"?: string,"subscription_id"?: string | null,"subtotal"?: number,"tax_amount"?: number,"tax_name"?: string | null,"tax_rate"?: number,"total"?: number,"updated_at"?: string,"user_id"?: string | null,"zone_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_address_id_fkey"
      columns: ["address_id"]
isOneToOne: false
      referencedRelation: "addresses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_cash_session_id_fkey"
      columns: ["cash_session_id"]
isOneToOne: false
      referencedRelation: "cash_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_delivered_by_fkey"
      columns: ["delivered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_packed_by_fkey"
      columns: ["packed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_point_id_fkey"
      columns: ["point_id"]
isOneToOne: false
      referencedRelation: "sale_points"
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
                },"payment_methods": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"kind": string,"name": string,"needs_reference": boolean,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"kind"?: string,"name": string,"needs_reference"?: boolean,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"kind"?: string,"name"?: string,"needs_reference"?: boolean,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"cash_session_id": string | null,"change_amount": number | null,"created_at": string,"created_by": string | null,"id": string,"method_id": string | null,"method_name": string | null,"order_id": string,"provider": string,"received_amount": number | null,"reference": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"cash_session_id"?: string | null,"change_amount"?: number | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"method_id"?: string | null,"method_name"?: string | null,"order_id": string,"provider"?: string,"received_amount"?: number | null,"reference"?: string,"status": string
                  }
                  Update: {
                    "amount"?: number,"cash_session_id"?: string | null,"change_amount"?: number | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"method_id"?: string | null,"method_name"?: string | null,"order_id"?: string,"provider"?: string,"received_amount"?: number | null,"reference"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_cash_session_id_fkey"
      columns: ["cash_session_id"]
isOneToOne: false
      referencedRelation: "cash_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_method_id_fkey"
      columns: ["method_id"]
isOneToOne: false
      referencedRelation: "payment_methods"
      referencedColumns: ["id"]
    },{
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
                },"point_load_items": {
                  Row: {
                    "dispatched": number,"load_id": string,"planned": number,"produced": number,"product_id": string,"received": number,"to_produce": number
                  }
                  ComputedFields: never
                  Insert: {
                    "dispatched"?: number,"load_id": string,"planned"?: number,"produced"?: number,"product_id": string,"received"?: number,"to_produce"?: number
                  }
                  Update: {
                    "dispatched"?: number,"load_id"?: string,"planned"?: number,"produced"?: number,"product_id"?: string,"received"?: number,"to_produce"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "point_load_items_load_id_fkey"
      columns: ["load_id"]
isOneToOne: false
      referencedRelation: "point_loads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "point_load_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "point_load_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"point_loads": {
                  Row: {
                    "closed_at": string | null,"closed_by": string | null,"created_at": string,"created_by": string | null,"dispatched_at": string | null,"dispatched_by": string | null,"id": string,"kitchen_id": string,"load_date": string,"notes": string,"point_id": string,"received_at": string | null,"received_by": string | null,"sent_at": string | null,"status": string,"transport_cost": number,"transport_entry_id": string | null,"transport_from_cash": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"dispatched_at"?: string | null,"dispatched_by"?: string | null,"id"?: string,"kitchen_id": string,"load_date": string,"notes"?: string,"point_id": string,"received_at"?: string | null,"received_by"?: string | null,"sent_at"?: string | null,"status"?: string,"transport_cost"?: number,"transport_entry_id"?: string | null,"transport_from_cash"?: boolean
                  }
                  Update: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"dispatched_at"?: string | null,"dispatched_by"?: string | null,"id"?: string,"kitchen_id"?: string,"load_date"?: string,"notes"?: string,"point_id"?: string,"received_at"?: string | null,"received_by"?: string | null,"sent_at"?: string | null,"status"?: string,"transport_cost"?: number,"transport_entry_id"?: string | null,"transport_from_cash"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "point_loads_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "point_loads_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "point_loads_dispatched_by_fkey"
      columns: ["dispatched_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "point_loads_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "point_loads_point_id_fkey"
      columns: ["point_id"]
isOneToOne: false
      referencedRelation: "sale_points"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "point_loads_received_by_fkey"
      columns: ["received_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "point_loads_transport_entry_id_fkey"
      columns: ["transport_entry_id"]
isOneToOne: false
      referencedRelation: "finance_entries"
      referencedColumns: ["id"]
    }
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
                    "delivery_date": string,"duration_seconds": number | null,"finished_at": string | null,"finished_by": string | null,"id": string,"kind": string,"kitchen_id": string,"load_id": string | null,"name": string,"product_id": string | null,"quantity": number,"slot_id": string | null,"started_at": string,"started_by": string | null,"status": string,"total_cost": number
                  }
                  ComputedFields: never
                  Insert: {
                    "delivery_date": string,"duration_seconds"?: number | null,"finished_at"?: string | null,"finished_by"?: string | null,"id"?: string,"kind": string,"kitchen_id": string,"load_id"?: string | null,"name": string,"product_id"?: string | null,"quantity": number,"slot_id"?: string | null,"started_at"?: string,"started_by"?: string | null,"status"?: string,"total_cost"?: number
                  }
                  Update: {
                    "delivery_date"?: string,"duration_seconds"?: number | null,"finished_at"?: string | null,"finished_by"?: string | null,"id"?: string,"kind"?: string,"kitchen_id"?: string,"load_id"?: string | null,"name"?: string,"product_id"?: string | null,"quantity"?: number,"slot_id"?: string | null,"started_at"?: string,"started_by"?: string | null,"status"?: string,"total_cost"?: number
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
      foreignKeyName: "prep_batches_load_id_fkey"
      columns: ["load_id"]
isOneToOne: false
      referencedRelation: "point_loads"
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
                },"product_channel_prices": {
                  Row: {
                    "channel": string,"price": number,"product_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"price": number,"product_id": string,"updated_at"?: string
                  }
                  Update: {
                    "channel"?: string,"price"?: number,"product_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_channel_prices_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "product_channel_prices_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"allergens": (string)[],"category_id": string,"created_at": string,"description": string,"dietary_tags": (string)[],"featured": boolean,"id": string,"image_url": string | null,"kind": string,"name": string,"nutrition": NonNullable<Json>,"nutrition_manual": NonNullable<Json>,"nutrition_mode": string,"price": number,"shelf_life_hours": number | null,"slug": string,"sold_at_points": boolean,"sort": number,"tag": string | null,"target_margin": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"allergens"?: (string)[],"category_id": string,"created_at"?: string,"description"?: string,"dietary_tags"?: (string)[],"featured"?: boolean,"id"?: string,"image_url"?: string | null,"kind"?: string,"name": string,"nutrition"?: NonNullable<Json>,"nutrition_manual"?: NonNullable<Json>,"nutrition_mode"?: string,"price"?: number,"shelf_life_hours"?: number | null,"slug": string,"sold_at_points"?: boolean,"sort"?: number,"tag"?: string | null,"target_margin"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"allergens"?: (string)[],"category_id"?: string,"created_at"?: string,"description"?: string,"dietary_tags"?: (string)[],"featured"?: boolean,"id"?: string,"image_url"?: string | null,"kind"?: string,"name"?: string,"nutrition"?: NonNullable<Json>,"nutrition_manual"?: NonNullable<Json>,"nutrition_mode"?: string,"price"?: number,"shelf_life_hours"?: number | null,"slug"?: string,"sold_at_points"?: boolean,"sort"?: number,"tag"?: string | null,"target_margin"?: number | null,"updated_at"?: string
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
                    "created_at": string,"description": string,"id": string,"is_system": boolean,"key": string,"kitchen_assignable": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_system"?: boolean,"key": string,"kitchen_assignable"?: boolean,"name": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_system"?: boolean,"key"?: string,"kitchen_assignable"?: boolean,"name"?: string
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
                },"sale_point_users": {
                  Row: {
                    "point_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "point_id": string,"user_id": string
                  }
                  Update: {
                    "point_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sale_point_users_point_id_fkey"
      columns: ["point_id"]
isOneToOne: false
      referencedRelation: "sale_points"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_point_users_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"sale_points": {
                  Row: {
                    "active": boolean,"address": string,"created_at": string,"id": string,"kitchen_id": string,"name": string,"public_code": string,"schedule": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"address"?: string,"created_at"?: string,"id"?: string,"kitchen_id": string,"name": string,"public_code"?: string,"schedule"?: string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"address"?: string,"created_at"?: string,"id"?: string,"kitchen_id"?: string,"name"?: string,"public_code"?: string,"schedule"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sale_points_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
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
                    "amount": number,"created_at": string,"id": string,"kind": string,"order_id": string | null,"provider": string,"reference": string,"status": string,"subscription_id": string,"tax_amount": number,"tax_name": string | null,"tax_rate": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"kind": string,"order_id"?: string | null,"provider"?: string,"reference"?: string,"status": string,"subscription_id": string,"tax_amount"?: number,"tax_name"?: string | null,"tax_rate"?: number
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"kind"?: string,"order_id"?: string | null,"provider"?: string,"reference"?: string,"status"?: string,"subscription_id"?: string,"tax_amount"?: number,"tax_name"?: string | null,"tax_rate"?: number
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
                },"tax_rates": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string,"rate": number,"valid_from": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"rate": number,"valid_from": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"rate"?: number,"valid_from"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tax_rates_created_by_fkey"
      columns: ["created_by"]
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
                },"user_kitchens": {
                  Row: {
                    "created_at": string,"kitchen_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"kitchen_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"kitchen_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_kitchens_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_kitchens_user_id_fkey"
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
            "dish_stock": {
                  Row: {
                    "expires_at": string,"kitchen_id": string,"load_id": string | null,"location": string,"lot_id": string,"point_id": string | null,"produced_at": string,"product_id": string,"quantity": number | null,"unit_cost": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "dish_lots_kitchen_id_fkey"
      columns: ["kitchen_id"]
isOneToOne: false
      referencedRelation: "kitchens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_lots_load_id_fkey"
      columns: ["load_id"]
isOneToOne: false
      referencedRelation: "point_loads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_lots_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "dish_lots_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_movements_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "dish_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dish_movements_point_id_fkey"
      columns: ["point_id"]
isOneToOne: false
      referencedRelation: "sale_points"
      referencedColumns: ["id"]
    }
                  ]
                },"order_food_costs": {
                  Row: {
                    "food_cost": number | null,"order_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"prep_stats": {
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
            "add_order_lines":
{ Args: { "p_channel": string,"p_items": Json,"p_order_id": string }; Returns: number
                           },
"add_order_to_route":
{ Args: { "p_after_seq": number,"p_eta": string,"p_extra_m": number,"p_extra_s": number,"p_order_id": string,"p_route_id": string }; Returns: number
                           },
"add_team_member":
{ Args: { "p_email": string,"p_kitchen_id": string,"p_role_id": string }; Returns: string
                           },
"admin_user_auth":
{ Args: { "p_user_id": string }; Returns: {
              "email_confirmed_at": string,"last_sign_in_at": string,"providers": (string)[]
            }[]
                           },
"basket_max_orders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"can_kitchen":
{ Args: { "k": string }; Returns: boolean
                           },
"can_pack_route":
{ Args: { "p_route_id": string }; Returns: boolean
                           },
"can_point":
{ Args: { "p_point_id": string }; Returns: boolean
                           },
"can_see_order":
{ Args: { "p_channel": string,"p_kitchen_id": string,"p_user_id": string }; Returns: boolean
                           },
"cancel_my_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"cancel_my_subscription":
{ Args: { "p_subscription_id": string }; Returns: undefined
                           },
"cancel_point_load":
{ Args: { "p_load_id": string }; Returns: undefined
                           },
"cancel_prep_batch":
{ Args: { "p_batch_id": string }; Returns: undefined
                           },
"cancel_subscription_delivery":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"cash_session_totals":
{ Args: { "p_session_id": string }; Returns: Json
                           },
"channel_price":
{ Args: { "p_channel": string,"p_product_id": string }; Returns: number
                           },
"close_cash_session":
{ Args: { "p_counted": number,"p_note"?: string,"p_session_id": string }; Returns: number
                           },
"close_kitchen_slot":
{ Args: { "p_date": string,"p_kitchen_id": string,"p_note": string,"p_reason": string,"p_slot_id": string }; Returns: number
                           },
"close_point_load":
{ Args: { "p_items": Json,"p_load_id": string }; Returns: number
                           },
"complete_route_if_done":
{ Args: { "p_route_id": string }; Returns: undefined
                           },
"counter_cancel":
{ Args: { "p_note"?: string,"p_order_id": string }; Returns: undefined
                           },
"counter_charge":
{ Args: { "p_method_id": string,"p_order_id": string,"p_received"?: number,"p_reference"?: string }; Returns: string
                           },
"counter_create_order":
{ Args: { "p_items": Json,"p_kitchen_id": string,"p_name"?: string,"p_notes"?: string,"p_phone"?: string,"p_source"?: string }; Returns: {
              "order_code": string,"order_id": string
            }[]
                           },
"counter_deliver":
{ Args: { "p_order_id": string }; Returns: undefined
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
"dispatch_point_load":
{ Args: { "p_items": Json,"p_load_id": string }; Returns: undefined
                           },
"finish_prep_batch":
{ Args: { "p_batch_id": string }; Returns: number
                           },
"has_open_kitchen_incident":
{ Args: { "p_order_id": string }; Returns: boolean
                           },
"has_permission":
{ Args: { "perm": string }; Returns: boolean
                           },
"has_restricted_role":
{ Args: { "p_user": string }; Returns: boolean
                           },
"incident_reason_label":
{ Args: { "p_reason": string }; Returns: string
                           },
"is_point_user":
{ Args: { "p_point_id": string }; Returns: boolean
                           },
"is_staff_role":
{ Args: { "rid": string }; Returns: boolean
                           },
"item_in_progress":
{ Args: { "p_order_item_id": string }; Returns: number
                           },
"item_unit_cost":
{ Args: { "p_order_item_id": string }; Returns: number
                           },
"kitchen_orders":
{ Args: { "p_date": string,"p_kitchen_id": string,"p_slot_id": string }; Returns: {
              "address_id": string | null,
"address_snapshot": Json | null,
"cancelled_at": string | null,
"cash_session_id": string | null,
"channel": string,
"code": string,
"contact_name": string,
"contact_phone": string,
"created_at": string,
"created_by": string | null,
"delivered_at": string | null,
"delivered_by": string | null,
"delivery_date": string,
"delivery_fee": number,
"delivery_photo_path": string | null,
"id": string,
"kind": string,
"kitchen_id": string | null,
"notes": string,
"on_hold": boolean,
"packed_at": string | null,
"packed_by": string | null,
"paid_at": string | null,
"payment_status": string,
"point_id": string | null,
"prepared_at": string | null,
"slot_id": string | null,
"slot_label": string,
"source": string,
"status": string,
"subscription_id": string | null,
"subtotal": number,
"tax_amount": number,
"tax_name": string | null,
"tax_rate": number,
"total": number,
"updated_at": string,
"user_id": string | null,
"zone_id": string | null
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
"manages_user":
{ Args: { "p_user": string }; Returns: boolean
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
"my_kitchens":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"my_open_cash_session":
{ Args: { "p_kitchen_id": string }; Returns: string
                           },
"my_permissions":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"notify_permission":
{ Args: { "p_body": string,"p_href": string,"p_kind": string,"p_title": string,"perm": string }; Returns: undefined
                           },
"open_cash_session":
{ Args: { "p_kitchen_id": string,"p_opening": number }; Returns: string
                           },
"open_point_cash":
{ Args: { "p_opening": number,"p_point_id": string }; Returns: string
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
"point_cancel_sale":
{ Args: { "p_note": string,"p_order_id": string }; Returns: undefined
                           },
"point_manageable":
{ Args: { "p_point_id": string }; Returns: boolean
                           },
"point_sell":
{ Args: { "p_items": Json,"p_method_id": string,"p_point_id": string,"p_received"?: number,"p_reference"?: string }; Returns: string
                           },
"point_suggestions":
{ Args: { "p_date": string,"p_point_id": string }; Returns: {
              "avg_sold": number,"kitchen_stock": number,"loads": number,"product_id": string
            }[]
                           },
"public_point_menu":
{ Args: { "p_code": string }; Returns: Json
                           },
"purchase_subscription":
{ Args: { "p_deliveries": Json,"p_plan_id": string }; Returns: {
              "subscription_code": string,"subscription_id": string
            }[]
                           },
"receive_point_load":
{ Args: { "p_items": Json,"p_load_id": string }; Returns: number
                           },
"recompute_nutrition":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"record_routing_factor":
{ Args: { "p_measured": number }; Returns: number
                           },
"renumber_route":
{ Args: { "p_route_id": string }; Returns: undefined
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
"save_point_plan":
{ Args: { "p_date": string,"p_items": Json,"p_notes"?: string,"p_point_id": string }; Returns: string
                           },
"schedule_subscription_delivery":
{ Args: { "p_delivery": Json,"p_pay"?: boolean,"p_subscription_id": string }; Returns: {
              "charged": number,"order_code": string,"order_id": string
            }[]
                           },
"send_point_load":
{ Args: { "p_load_id": string }; Returns: undefined
                           },
"set_basket_max_orders":
{ Args: { "p_max": number }; Returns: undefined
                           },
"set_delivery_wait_minutes":
{ Args: { "p_minutes": number }; Returns: undefined
                           },
"set_kitchen_min_stock":
{ Args: { "p_ingredient_id": string,"p_kitchen_id": string,"p_min": number }; Returns: undefined
                           },
"set_order_status":
{ Args: { "p_note"?: string,"p_order_id": string,"p_status": string }; Returns: undefined
                           },
"set_point_transport":
{ Args: { "p_amount": number,"p_from_cash": boolean,"p_load_id": string,"p_note"?: string }; Returns: undefined
                           },
"set_route_courier":
{ Args: { "p_courier_id": string,"p_route_id": string }; Returns: boolean
                           },
"set_user_active":
{ Args: { "p_active": boolean,"p_reason"?: string,"p_user_id": string }; Returns: undefined
                           },
"set_user_kitchens":
{ Args: { "p_kitchen_ids": (string)[],"p_user_id": string }; Returns: undefined
                           },
"setting_int":
{ Args: { "p_default": number,"p_key": string }; Returns: number
                           },
"slot_kitchen_pending":
{ Args: { "p_date": string,"p_kitchen_id": string,"p_slot_id": string }; Returns: number
                           },
"slot_unprepared":
{ Args: { "p_date": string,"p_kitchen_id": string,"p_slot_id": string }; Returns: number
                           },
"start_delivery_route":
{ Args: { "p_route_id": string }; Returns: undefined
                           },
"start_load_batch":
{ Args: { "p_load_id": string,"p_product_id": string }; Returns: string
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
"take_dishes":
{ Args: { "p_any"?: boolean,"p_kind": string,"p_kitchen_id": string,"p_load_id"?: string,"p_location": string,"p_note"?: string,"p_order_item_id"?: string,"p_point_id": string,"p_product_id": string,"p_quantity": number }; Returns: number
                           },
"tax_on":
{ Args: { "p_date": string }; Returns: {
              "name": string,"rate": number
            }[]
                           },
"today_local":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"transfer_stock":
{ Args: { "p_from": string,"p_ingredient_id": string,"p_note"?: string,"p_quantity": number,"p_to": string }; Returns: string
                           },
"transfer_targets":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"name": string
            }[]
                           },
"update_subscription_delivery":
{ Args: { "p_delivery": Json,"p_order_id": string,"p_pay"?: boolean }; Returns: number
                           },
"user_can_kitchen":
{ Args: { "k": string,"p_user": string }; Returns: boolean
                           },
"verify_route_all":
{ Args: { "p_route_id": string }; Returns: number
                           },
"verify_route_stop":
{ Args: { "p_ok"?: boolean,"p_order_id": string }; Returns: undefined
                           },
"write_off_kitchen_dishes":
{ Args: { "p_kind": string,"p_lot_id": string,"p_note"?: string,"p_quantity": number }; Returns: undefined
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
