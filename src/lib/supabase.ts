import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface User {
  id: string
  name: string
  email: string
  phone: string
  address: string
  points: number
  streak: number
  last_check_in: string | null
  total_check_ins: number
  level: number
  created_at: string
  updated_at: string
}

export interface Prize {
  id: string
  name: string
  points: number
  description: string
  available: boolean
  created_at: string
  updated_at: string
}

export interface CheckIn {
  id: string
  user_id: string
  check_in_date: string
  points_earned: number
  streak_at_time: number
  created_at: string
}

export interface PrizeRedemption {
  id: string
  user_id: string
  prize_id: string
  points_spent: number
  redeemed_at: string
  status: 'pending' | 'completed' | 'cancelled'
}