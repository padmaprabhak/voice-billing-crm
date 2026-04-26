import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../store/useAuthStore'
import { backendClient } from '../api/axios'
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const schema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const { setAuth } = useAuthStore()
  const navigate    = useNavigate()

  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await backendClient.post('/auth/register', {
        name:     data.name,
        email:    data.email,
        password: data.password,
      })

      const payload = res.data?.data
      if (!payload?.accessToken) throw new Error('No token in response')

      setAuth({
        token: payload.accessToken,
        user:  {
          id:    payload.user?.id,
          name:  payload.user?.name,
          email: payload.user?.email,
          role:  payload.user?.role,
        },
      })

      toast.success('Account created! Welcome to VoiceBill CRM.')
      navigate('/dashboard')
    } catch (err) {
      const status = err?.response?.status
      const msg    = err?.response?.data?.error || err?.response?.data?.message || err?.message

      if (status === 409 || msg?.toLowerCase().includes('already exists')) {
        setError('email', { message: 'This email is already registered' })
      } else if (!err?.response) {
        toast.error('Cannot reach backend — is Spring Boot running on port 8080?')
      } else {
        toast.error(msg || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-dm">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center">
            <Zap size={17} className="text-slate-950" fill="currentColor" />
          </div>
          <span className="text-base font-bold text-white font-syne">VoiceBill CRM</span>
        </div>

        <h1 className="font-syne text-2xl font-bold text-white mb-1">Create account</h1>
        <p className="text-sm text-slate-500 mb-8">Register to get started</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">Full Name</label>
            <input
              type="text" placeholder="Your Name" {...register('name')}
              className={`w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-sm text-slate-200
                placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition
                ${errors.name ? 'border-rose-500/60' : 'border-slate-800 focus:border-cyan-500/60'}`}
            />
            {errors.name && <p className="mt-1.5 text-xs text-rose-400">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">Email Address</label>
            <input
              type="email" placeholder="you@example.com" {...register('email')}
              className={`w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-sm text-slate-200
                placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition
                ${errors.email ? 'border-rose-500/60' : 'border-slate-800 focus:border-cyan-500/60'}`}
            />
            {errors.email && <p className="mt-1.5 text-xs text-rose-400">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...register('password')}
                className={`w-full px-4 py-2.5 pr-10 rounded-lg bg-slate-900 border text-sm text-slate-200
                  placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition
                  ${errors.password ? 'border-rose-500/60' : 'border-slate-800 focus:border-cyan-500/60'}`}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-rose-400">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
              bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 active:scale-[0.98]
              transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}