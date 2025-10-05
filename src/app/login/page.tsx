"use client"

import { useState, useEffect } from 'react'
import { User, Mail, ArrowLeft, LogIn } from 'lucide-react'
import { userService } from '@/lib/database'
import type { User as UserType } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Verificar se já está logado
  useEffect(() => {
    const savedUserId = localStorage.getItem('currentUserId')
    if (savedUserId) {
      router.push('/')
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError('Por favor, digite seu email')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      // Buscar usuário pelo email
      const user = await userService.findByEmail(email)
      
      if (!user) {
        setError('Email não encontrado. Verifique se você já possui cadastro.')
        return
      }

      // Salvar usuário no localStorage
      localStorage.setItem('currentUserId', user.id)
      
      // Redirecionar para página principal
      router.push('/')
      
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Entrar na Conta</h2>
            <p className="text-purple-200">Digite seu email para acessar sua conta</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="text-center">
              <p className="text-purple-200 text-sm mb-4">
                Não tem uma conta ainda?
              </p>
              <button
                onClick={() => router.push('/')}
                className="text-purple-300 hover:text-white transition-colors duration-300 font-medium"
              >
                Fazer cadastro
              </button>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}