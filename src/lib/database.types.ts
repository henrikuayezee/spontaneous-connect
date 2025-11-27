export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    name: string
                    partner_name: string
                    partner_phone: string | null
                    daily_call_limit: number
                    active_days: string
                    morning_start: string
                    evening_end: string
                    preferred_platforms: string
                    timezone: string
                    is_active: boolean
                    created_at: string
                    updated_at: string
                    version: number
                }
                Insert: {
                    id?: string
                    email: string
                    name: string
                    partner_name: string
                    partner_phone?: string | null
                    daily_call_limit?: number
                    active_days?: string
                    morning_start?: string
                    evening_end?: string
                    preferred_platforms?: string
                    timezone?: string
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                    version?: number
                }
                Update: {
                    id?: string
                    email?: string
                    name?: string
                    partner_name?: string
                    partner_phone?: string | null
                    daily_call_limit?: number
                    active_days?: string
                    morning_start?: string
                    evening_end?: string
                    preferred_platforms?: string
                    status: 'suggested' | 'called' | 'skipped' | 'later' | 'failed'
                    success_rating: number | null
                    notes: string | null
                    metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    scheduled_time: string
                    actual_time?: string | null
                    platform_used?: string | null
                    status?: 'suggested' | 'called' | 'skipped' | 'later' | 'failed'
                    success_rating?: number | null
                    notes?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    scheduled_time?: string
                    actual_time?: string | null
                    platform_used?: string | null
                    status?: 'suggested' | 'called' | 'skipped' | 'later' | 'failed'
                    success_rating?: number | null
                    notes?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
            },
            blocked_times: {
                Row: {
                    id: string
                    user_id: string
                    block_name: string
                    start_time: string
                    end_time: string
                    repeat_type: 'daily' | 'weekdays' | 'weekends' | 'custom' | 'once'
                    days_of_week: string | null
                    is_active: boolean
                    priority: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    block_name: string
                    start_time: string
                    end_time: string
                    repeat_type: 'daily' | 'weekdays' | 'weekends' | 'custom' | 'once'
                    days_of_week?: string | null
                    is_active?: boolean
                    priority?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    block_name?: string
                    start_time?: string
                    end_time?: string
                    repeat_type?: 'daily' | 'weekdays' | 'weekends' | 'custom' | 'once'
                    days_of_week?: string | null
                    is_active?: boolean
                    priority?: number
                    created_at?: string
                }
            },
            schedule_helper: {
                Row: {
                    id: string
                    user_id: string
                    next_call_due: string | null
                    last_call_time: string | null
                    calls_today: number
                    daily_reset_date: string
                    last_generated: string
                    updated_at: string
                    lock_version: number
                }
                Insert: {
                    id?: string
                    user_id: string
                    next_call_due?: string | null
                    last_call_time?: string | null
                    calls_today?: number
                    daily_reset_date?: string
                    last_generated?: string
                    updated_at?: string
                    lock_version?: number
                }
                Update: {
                    id?: string
                    user_id?: string
                    next_call_due?: string | null
                    last_call_time?: string | null
                    calls_today?: number
                    daily_reset_date?: string
                    last_generated?: string
                    updated_at?: string
                    lock_version?: number
                }
            },
            push_subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    subscription: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    subscription: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    subscription?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
        }
    }
}
