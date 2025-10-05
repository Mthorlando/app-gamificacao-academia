"use client"

import { useState, useEffect } from 'react'
import { Trophy, Zap, Users, Calendar, Star, Gift, CheckCircle, Plus, User, Mail, Phone, MapPin, X, Copy, Clock, Share2, UserPlus, ChevronDown, History } from 'lucide-react'
import { userService, prizeService, checkInService, redemptionService } from '@/lib/database'
import type { User as UserType, Prize, PrizeRedemption } from '@/lib/supabase'

export default function GymGamificationApp() {
  const [users, setUsers] = useState<UserType[]>([])
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [showRegister, setShowRegister] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showPrizes, setShowPrizes] = useState(false)
  const [showRedemptionModal, setShowRedemptionModal] = useState(false)
  const [showAffiliateModal, setShowAffiliateModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showRedemptionHistory, setShowRedemptionHistory] = useState(false)
  const [userRedemptions, setUserRedemptions] = useState<any[]>([])
  const [selectedRedemption, setSelectedRedemption] = useState<any>(null)
  const [redemptionData, setRedemptionData] = useState<{
    prize: Prize
    code: string
    expiryDate: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    referredBy: ''
  })

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Carregar prêmios
      const prizesData = await prizeService.getAll()
      setPrizes(prizesData)
      
      // Carregar usuários para leaderboard
      const usersData = await userService.getLeaderboard()
      setUsers(usersData)
      
      // Verificar se há usuário salvo no localStorage
      const savedUserId = localStorage.getItem('currentUserId')
      if (savedUserId) {
        try {
          const userData = await userService.findById(savedUserId)
          setCurrentUser(userData)
        } catch (error) {
          localStorage.removeItem('currentUserId')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Carregar histórico de resgates do usuário
  const loadUserRedemptions = async () => {
    if (!currentUser) return
    
    try {
      const redemptions = await redemptionService.getUserRedemptions(currentUser.id)
      setUserRedemptions(redemptions)
    } catch (error) {
      console.error('Erro ao carregar resgates:', error)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      alert('Por favor, preencha todos os campos obrigatórios!')
      return
    }
    
    try {
      setLoading(true)
      
      // Verificar se email já existe
      const existingUser = await userService.findByEmail(formData.email)
      if (existingUser) {
        alert('Este email já está cadastrado!')
        return
      }

      // Verificar se há código de indicação válido
      let referrer = null
      if (formData.referredBy) {
        try {
          referrer = await userService.findByEmail(formData.referredBy)
          if (!referrer) {
            alert('Email do indicador não encontrado!')
            return
          }
        } catch (error) {
          alert('Email do indicador não encontrado!')
          return
        }
      }

      // Criar novo usuário
      const newUser = await userService.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        points: 0,
        streak: 0,
        total_check_ins: 0,
        level: 1
      })

      // Se há indicação válida, dar 100 pontos ao indicador
      if (referrer) {
        const newPoints = referrer.points + 100
        const newLevel = Math.floor(newPoints / 100) + 1
        
        await userService.update(referrer.id, {
          points: newPoints,
          level: newLevel
        })
        
        alert(`Cadastro realizado com sucesso! ${referrer.name} ganhou 100 pontos pela sua indicação! 🎉`)
      } else {
        alert('Cadastro realizado com sucesso! Bem-vindo ao GymPoints! 🎉')
      }

      setCurrentUser(newUser)
      localStorage.setItem('currentUserId', newUser.id)
      
      // Atualizar lista de usuários
      const updatedUsers = await userService.getLeaderboard()
      setUsers(updatedUsers)
      
      setFormData({ name: '', email: '', phone: '', address: '', referredBy: '' })
      setShowRegister(false)
      
    } catch (error) {
      console.error('Erro ao cadastrar:', error)
      alert('Erro ao realizar cadastro. Verifique se todas as informações estão corretas e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      
      // Verificar se já fez check-in hoje
      const hasCheckedIn = await checkInService.hasCheckedInToday(currentUser.id)
      if (hasCheckedIn) {
        alert('Você já fez check-in hoje!')
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const lastCheckIn = await checkInService.getLastCheckIn(currentUser.id)
      
      // Calcular se é consecutivo
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      const isConsecutive = lastCheckIn && lastCheckIn.check_in_date === yesterdayStr
      const newStreak = isConsecutive ? currentUser.streak + 1 : 1
      
      // Calcular pontos (10 base + bônus por sequência)
      const pointsEarned = 10 + (isConsecutive ? currentUser.streak * 2 : 0)
      const newPoints = currentUser.points + pointsEarned
      const newLevel = Math.floor(newPoints / 100) + 1

      // Registrar check-in
      await checkInService.create({
        user_id: currentUser.id,
        check_in_date: today,
        points_earned: pointsEarned,
        streak_at_time: newStreak
      })

      // Atualizar usuário - CORRIGIDO: usando apenas campos necessários
      const updatedUser = await userService.update(currentUser.id, {
        points: newPoints,
        streak: newStreak,
        total_check_ins: currentUser.total_check_ins + 1,
        level: newLevel
      })

      setCurrentUser(updatedUser)
      
      // Atualizar leaderboard
      const updatedUsers = await userService.getLeaderboard()
      setUsers(updatedUsers)

      alert(`Check-in realizado! +${pointsEarned} pontos! 🎉`)
    } catch (error) {
      console.error('Erro ao fazer check-in:', error)
      alert('Erro ao fazer check-in. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Função para gerar código de resgate único
  const generateRedemptionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = 'GYM-'
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // Função para calcular data de expiração (30 dias)
  const getExpiryDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date.toLocaleDateString('pt-BR')
  }

  const handleRedeemPrize = async (prize: Prize) => {
    if (!currentUser || currentUser.points < prize.points) return

    try {
      setLoading(true)
      
      // Gerar código de resgate e data de expiração
      const redemptionCode = generateRedemptionCode()
      const expiryDate = getExpiryDate()
      
      // Criar resgate
      await redemptionService.create({
        user_id: currentUser.id,
        prize_id: prize.id,
        points_spent: prize.points,
        status: 'pending'
      })

      // Atualizar pontos do usuário
      const updatedUser = await userService.update(currentUser.id, {
        points: currentUser.points - prize.points
      })

      setCurrentUser(updatedUser)
      
      // Atualizar leaderboard
      const updatedUsers = await userService.getLeaderboard()
      setUsers(updatedUsers)

      // Configurar dados do modal de resgate
      setRedemptionData({
        prize,
        code: redemptionCode,
        expiryDate
      })
      
      setShowRedemptionModal(true)
    } catch (error) {
      console.error('Erro ao resgatar prêmio:', error)
      alert('Erro ao resgatar prêmio. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      // Tentar usar a API moderna do Clipboard
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        alert('Copiado para a área de transferência!')
        return
      }
      
      // Fallback para ambientes sem suporte à API do Clipboard
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          alert('Copiado para a área de transferência!')
        } else {
          throw new Error('Comando copy falhou')
        }
      } catch (err) {
        // Se tudo falhar, mostrar o texto para cópia manual
        prompt('Copie o texto abaixo:', text)
      } finally {
        document.body.removeChild(textArea)
      }
    } catch (error) {
      console.error('Erro ao copiar:', error)
      // Último recurso: mostrar o texto para cópia manual
      prompt('Não foi possível copiar automaticamente. Copie o texto abaixo:', text)
    }
  }

  const getStreakBonus = (streak: number) => {
    if (streak >= 30) return 'Lenda'
    if (streak >= 21) return 'Campeão'
    if (streak >= 14) return 'Guerreiro'
    if (streak >= 7) return 'Dedicado'
    return 'Iniciante'
  }

  const canCheckInToday = async () => {
    if (!currentUser) return false
    try {
      const hasCheckedIn = await checkInService.hasCheckedInToday(currentUser.id)
      return !hasCheckedIn
    } catch {
      return false
    }
  }

  const [canCheckIn, setCanCheckIn] = useState(false)

  useEffect(() => {
    if (currentUser) {
      canCheckInToday().then(setCanCheckIn)
    }
  }, [currentUser])

  // Função para gerar link de indicação
  const generateReferralLink = () => {
    if (!currentUser) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}?ref=${encodeURIComponent(currentUser.email)}`
  }

  // Verificar se há código de indicação na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const refCode = urlParams.get('ref')
    if (refCode && !currentUser) {
      setFormData(prev => ({ ...prev, referredBy: decodeURIComponent(refCode) }))
      setShowRegister(true)
    }
  }, [currentUser])

  // Fechar menu do usuário quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading && !currentUser && !showRegister && !showLeaderboard && !showPrizes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  // Modal de Histórico de Resgates
  if (showRedemptionHistory) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Meus Resgates 🎁</h2>
            <button
              onClick={() => setShowRedemptionHistory(false)}
              className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {userRedemptions.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <p className="text-purple-200">Você ainda não resgatou nenhum prêmio</p>
              <button
                onClick={() => {
                  setShowRedemptionHistory(false)
                  setShowPrizes(true)
                }}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
              >
                Ver Loja de Prêmios
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {userRedemptions.map((redemption, index) => (
                <div 
                  key={redemption.id} 
                  className="bg-white/5 rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/10 transition-all duration-300"
                  onClick={() => {
                    const code = generateRedemptionCode()
                    const expiryDate = getExpiryDate()
                    setSelectedRedemption({
                      ...redemption,
                      code,
                      expiryDate
                    })
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{redemption.prizes?.name || 'Prêmio'}</h3>
                        <p className="text-purple-200 text-sm">{redemption.prizes?.description || 'Descrição não disponível'}</p>
                        <p className="text-purple-300 text-xs">
                          Resgatado em {new Date(redemption.redeemed_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
                        {redemption.points_spent} pts
                      </div>
                      <div className={`text-xs mt-1 px-2 py-1 rounded ${
                        redemption.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        redemption.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {redemption.status === 'completed' ? 'Retirado' :
                         redemption.status === 'cancelled' ? 'Cancelado' :
                         'Pendente'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Modal de Detalhes do Resgate Selecionado
  if (selectedRedemption) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Código de Resgate 🎫</h2>
            <button
              onClick={() => setSelectedRedemption(null)}
              className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{selectedRedemption.prizes?.name}</h3>
            <p className="text-purple-200">{selectedRedemption.prizes?.description}</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-green-400" />
                <span className="text-purple-200 font-medium">Código de Resgate</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-black/30 text-green-400 px-3 py-2 rounded-lg font-mono text-lg flex-1">
                  {selectedRedemption.code}
                </code>
                <button
                  onClick={() => copyToClipboard(selectedRedemption.code)}
                  className="p-2 bg-green-500 hover:bg-green-600 rounded-lg transition-all duration-300"
                >
                  <Copy className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-400" />
                <span className="text-purple-200 font-medium">Prazo para Resgate</span>
              </div>
              <p className="text-white font-bold text-lg">Até {selectedRedemption.expiryDate}</p>
              <p className="text-orange-200 text-sm mt-1">30 dias a partir do resgate</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-purple-200">Data do Resgate:</span>
                <span className="text-white font-medium">
                  {new Date(selectedRedemption.redeemed_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-purple-200">Status:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  selectedRedemption.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  selectedRedemption.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {selectedRedemption.status === 'completed' ? 'Retirado' :
                   selectedRedemption.status === 'cancelled' ? 'Cancelado' :
                   'Pendente'}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-400/30">
              <h4 className="text-white font-bold mb-2">Como resgatar:</h4>
              <ol className="text-purple-200 text-sm space-y-1">
                <li>1. Vá até a recepção da academia</li>
                <li>2. Apresente este código de resgate</li>
                <li>3. Informe seu nome cadastrado</li>
                <li>4. Retire seu prêmio!</li>
              </ol>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => copyToClipboard(selectedRedemption.code)}
              className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar Código
            </button>
            <button
              onClick={() => setSelectedRedemption(null)}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Modal de Afiliados
  if (showAffiliateModal && currentUser) {
    const referralLink = generateReferralLink()
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Programa de Afiliados 🤝</h2>
            <button
              onClick={() => setShowAffiliateModal(false)}
              className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Indique e Ganhe!</h3>
            <p className="text-purple-200">Para cada pessoa que você indicar e se cadastrar, você ganha <span className="text-green-400 font-bold">100 pontos</span>!</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-5 h-5 text-blue-400" />
                <span className="text-purple-200 font-medium">Seu Link de Indicação</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="bg-black/30 text-blue-400 px-3 py-2 rounded-lg font-mono text-sm flex-1 border border-white/10"
                />
                <button
                  onClick={() => copyToClipboard(referralLink)}
                  className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-all duration-300"
                >
                  <Copy className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-400/30">
              <h4 className="text-white font-bold mb-2">Como funciona:</h4>
              <ol className="text-purple-200 text-sm space-y-1">
                <li>1. Compartilhe seu link de indicação</li>
                <li>2. A pessoa clica no link e se cadastra</li>
                <li>3. Você ganha 100 pontos automaticamente</li>
                <li>4. Use os pontos na loja de prêmios!</li>
              </ol>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-purple-200">Pontos por indicação:</span>
                <span className="text-green-400 font-bold text-xl">+100</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => copyToClipboard(referralLink)}
              className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar Link
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'GymPoints - Programa de Afiliados',
                    text: 'Junte-se ao GymPoints e transforme seus treinos em uma jornada gamificada!',
                    url: referralLink
                  })
                } else {
                  copyToClipboard(referralLink)
                }
              }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Modal de Resgate
  if (showRedemptionModal && redemptionData) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Prêmio Resgatado! 🎉</h2>
            <button
              onClick={() => setShowRedemptionModal(false)}
              className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{redemptionData.prize.name}</h3>
            <p className="text-purple-200">{redemptionData.prize.description}</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-green-400" />
                <span className="text-purple-200 font-medium">Código de Resgate</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-black/30 text-green-400 px-3 py-2 rounded-lg font-mono text-lg flex-1">
                  {redemptionData.code}
                </code>
                <button
                  onClick={() => copyToClipboard(redemptionData.code)}
                  className="p-2 bg-green-500 hover:bg-green-600 rounded-lg transition-all duration-300"
                >
                  <Copy className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-400" />
                <span className="text-purple-200 font-medium">Prazo para Resgate</span>
              </div>
              <p className="text-white font-bold text-lg">Até {redemptionData.expiryDate}</p>
              <p className="text-orange-200 text-sm mt-1">30 dias a partir de hoje</p>
            </div>

            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-400/30">
              <h4 className="text-white font-bold mb-2">Como resgatar:</h4>
              <ol className="text-purple-200 text-sm space-y-1">
                <li>1. Vá até a recepção da academia</li>
                <li>2. Apresente este código de resgate</li>
                <li>3. Informe seu nome cadastrado</li>
                <li>4. Retire seu prêmio!</li>
              </ol>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => copyToClipboard(redemptionData.code)}
              className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar Código
            </button>
            <button
              onClick={() => setShowRedemptionModal(false)}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showRegister) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Cadastro de Membro</h2>
              <p className="text-purple-200">Junte-se à gamificação da academia!</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">Telefone</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">Endereço</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Email do Indicador <span className="text-purple-400">(opcional)</span>
                </label>
                <input
                  type="email"
                  value={formData.referredBy}
                  onChange={(e) => setFormData({...formData, referredBy: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="email@indicador.com"
                />
                {formData.referredBy && (
                  <p className="text-green-400 text-sm mt-1">
                    ✨ Seu indicador ganhará 100 pontos quando você se cadastrar!
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="flex-1 py-3 px-4 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (showLeaderboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Ranking de Pontos</h2>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-300"
              >
                Voltar
              </button>
            </div>

            <div className="space-y-3">
              {users.map((user, index) => (
                <div key={user.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-500 text-yellow-900' :
                      index === 1 ? 'bg-gray-400 text-gray-900' :
                      index === 2 ? 'bg-orange-500 text-orange-900' :
                      'bg-purple-500 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{user.name}</h3>
                      <p className="text-purple-200 text-sm">Level {user.level} • {getStreakBonus(user.streak)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{user.points}</p>
                    <p className="text-purple-200 text-sm">pontos</p>
                  </div>
                </div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-purple-200">Nenhum membro cadastrado ainda</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (showPrizes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 text-pink-400" />
                <h2 className="text-2xl font-bold text-white">Loja de Prêmios</h2>
              </div>
              <button
                onClick={() => setShowPrizes(false)}
                className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-300"
              >
                Voltar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prizes.map((prize) => (
                <div key={prize.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Gift className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg">{prize.name}</h3>
                    <p className="text-purple-200 text-sm mt-1">{prize.description}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-bold mb-3">
                      {prize.points} pontos
                    </div>
                    <button
                      onClick={() => handleRedeemPrize(prize)}
                      disabled={!currentUser || currentUser.points < prize.points || loading}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                        currentUser && currentUser.points >= prize.points && !loading
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {loading ? 'Processando...' : 
                       currentUser && currentUser.points >= prize.points ? 'Resgatar' : 'Pontos Insuficientes'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {currentUser && (
              <div className="mt-6 text-center">
                <p className="text-purple-200">
                  Seus pontos: <span className="text-white font-bold text-xl">{currentUser.points}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">GymPoints</h1>
            </div>
            
            {currentUser && (
              <div className="relative user-menu-container">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu)
                    if (!showUserMenu) {
                      loadUserRedemptions()
                    }
                  }}
                  className="flex items-center gap-4 hover:bg-white/10 rounded-xl p-2 transition-all duration-300"
                >
                  <div className="text-right">
                    <p className="text-white font-medium">{currentUser.name}</p>
                    <p className="text-purple-200 text-sm">Level {currentUser.level}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-white transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Menu Suspenso */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-2xl z-[99999999]">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{currentUser.name}</p>
                          <p className="text-purple-200 text-sm">{currentUser.points} pontos • Level {currentUser.level}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setShowRedemptionHistory(true)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                      >
                        <History className="w-5 h-5 text-green-400" />
                        <div className="text-left">
                          <p className="font-medium">Meus Resgates</p>
                          <p className="text-purple-200 text-sm">Ver códigos e histórico</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          setCurrentUser(null)
                          localStorage.removeItem('currentUserId')
                          setShowUserMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300 mt-1"
                      >
                        <X className="w-5 h-5" />
                        <div className="text-left">
                          <p className="font-medium">Sair</p>
                          <p className="text-red-300 text-sm">Desconectar conta</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!currentUser ? (
          /* Welcome Screen */
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20 max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-4">Bem-vindo ao GymPoints!</h2>
              <p className="text-purple-200 text-lg mb-8">
                Transforme seus treinos em uma jornada gamificada. Ganhe pontos, suba de level e concorra a prêmios incríveis!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <h3 className="text-white font-bold mb-2">Check-in Diário</h3>
                  <p className="text-purple-200 text-sm">Marque presença e ganhe pontos todos os dias</p>
                </div>
                <div className="text-center">
                  <Star className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                  <h3 className="text-white font-bold mb-2">Sistema de Níveis</h3>
                  <p className="text-purple-200 text-sm">Evolua e desbloqueie novos benefícios</p>
                </div>
                <div className="text-center">
                  <Gift className="w-12 h-12 text-pink-400 mx-auto mb-3" />
                  <h3 className="text-white font-bold mb-2">Prêmios Exclusivos</h3>
                  <p className="text-purple-200 text-sm">Troque seus pontos por recompensas</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowRegister(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105"
                >
                  Começar Agora
                </button>
                <button
                  onClick={() => window.location.href = '/login'}
                  className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105"
                >
                  Já tenho conta
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard */
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-white font-medium">Pontos</h3>
                </div>
                <p className="text-3xl font-bold text-white">{currentUser.points}</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-6 h-6 text-green-400" />
                  <h3 className="text-white font-medium">Sequência</h3>
                </div>
                <p className="text-3xl font-bold text-white">{currentUser.streak}</p>
                <p className="text-purple-200 text-sm">{getStreakBonus(currentUser.streak)}</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="w-6 h-6 text-purple-400" />
                  <h3 className="text-white font-medium">Nível</h3>
                </div>
                <p className="text-3xl font-bold text-white">{currentUser.level}</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                  <h3 className="text-white font-medium">Check-ins</h3>
                </div>
                <p className="text-3xl font-bold text-white">{currentUser.total_check_ins}</p>
              </div>
            </div>

            {/* Check-in Button */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center z-10">
              <h2 className="text-2xl font-bold text-white mb-4">Check-in Diário</h2>
              <p className="text-purple-200 mb-6">
                {canCheckIn 
                  ? "Pronto para treinar hoje? Faça seu check-in e ganhe pontos!"
                  : "Check-in já realizado hoje! Volte amanhã para mais pontos."
                }
              </p>
              
              <button
                onClick={handleCheckIn}
                disabled={!canCheckIn || loading}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${
                  canCheckIn && !loading
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 hover:shadow-2xl transform hover:scale-105'
                    : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                }`}
              >
                {loading ? 'Processando...' : canCheckIn ? 'Fazer Check-in' : 'Check-in Realizado'}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowLeaderboard(true)}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-4">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                  <div>
                    <h3 className="text-white font-bold text-lg">Ranking</h3>
                    <p className="text-purple-200">Veja sua posição no ranking geral</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setShowPrizes(true)}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-4">
                  <Gift className="w-8 h-8 text-pink-400" />
                  <div>
                    <h3 className="text-white font-bold text-lg">Loja de Prêmios</h3>
                    <p className="text-purple-200">Troque seus pontos por recompensas</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowAffiliateModal(true)}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-4">
                  <UserPlus className="w-8 h-8 text-green-400" />
                  <div>
                    <h3 className="text-white font-bold text-lg">Programa de Afiliados</h3>
                    <p className="text-purple-200">Indique amigos e ganhe 100 pontos</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}