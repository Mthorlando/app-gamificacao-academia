import { supabase } from './supabase'
import type { User, Prize, CheckIn, PrizeRedemption } from './supabase'

// CRUD para Usuários
export const userService = {
  // Criar usuário - CORRIGIDO: removendo campos de timestamp problemáticos
  async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_check_in'>) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Buscar usuário por email
  async findByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()
    
    if (error) throw error
    return data
  },

  // Buscar usuário por ID
  async findById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Atualizar usuário - CORRIGIDO: removendo updated_at automático
  async update(id: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Listar todos os usuários ordenados por pontos
  async getLeaderboard() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('points', { ascending: false })
    
    if (error) throw error
    return data
  }
}

// CRUD para Prêmios
export const prizeService = {
  // Listar todos os prêmios disponíveis
  async getAll() {
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .eq('available', true)
      .order('points', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Buscar prêmio por ID
  async findById(id: string) {
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Criar novo prêmio
  async create(prizeData: Omit<Prize, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('prizes')
      .insert([prizeData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Atualizar prêmio
  async update(id: string, updates: Partial<Prize>) {
    const { data, error } = await supabase
      .from('prizes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// CRUD para Check-ins
export const checkInService = {
  // Criar check-in
  async create(checkInData: Omit<CheckIn, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('check_ins')
      .insert([checkInData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Verificar se usuário já fez check-in hoje
  async hasCheckedInToday(userId: string) {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('check_ins')
      .select('id')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return !!data
  },

  // Buscar último check-in do usuário
  async getLastCheckIn(userId: string) {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Buscar histórico de check-ins do usuário
  async getUserHistory(userId: string) {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false })
    
    if (error) throw error
    return data
  }
}

// CRUD para Resgates de Prêmios
export const redemptionService = {
  // Criar resgate
  async create(redemptionData: Omit<PrizeRedemption, 'id' | 'redeemed_at'>) {
    const { data, error } = await supabase
      .from('prize_redemptions')
      .insert([redemptionData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Buscar resgates do usuário
  async getUserRedemptions(userId: string) {
    const { data, error } = await supabase
      .from('prize_redemptions')
      .select(`
        *,
        prizes (
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .order('redeemed_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Atualizar status do resgate
  async updateStatus(id: string, status: 'pending' | 'completed' | 'cancelled') {
    const { data, error } = await supabase
      .from('prize_redemptions')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}