import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Strict restriction to authorized vendor account without disclosing internal identities
    if (email.toLowerCase().trim() !== 'harish@atharvatravels.com') {
      toast.error('Access restricted.')
      setIsLoading(false)
      return
    }

    try {
      await login(email, password)
      toast.success('Welcome back, Atharva Travels!')
      navigate('/')
    } catch {
      toast.error('Access restricted.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Apple-style subtle ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[380px] bg-gradient-to-b from-blue-600/20 via-sky-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-md w-full relative z-10">
        {/* Branding Area with New Transparent Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/95 backdrop-blur-md shadow-2xl p-3.5 mb-4 border border-white/40 ring-1 ring-white/20">
            <img src="/logo.png" alt="Glide Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Glide Vendor</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Atharva Travels B2B Operations Command</p>
        </div>

        {/* Login Card with Apple Squircle Curves */}
        <div className="card p-8 bg-white/95 backdrop-blur-2xl shadow-2xl border-white/40 rounded-3xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Vendor Portal Login</h2>
              <p className="text-xs text-slate-500 font-medium">Authorized partner authentication</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Registered Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secure Restricted Access Pill */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-slate-600 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Restricted Access: Authorized Personnel Only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
