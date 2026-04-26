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
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export default function Login() {
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading]  = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await backendClient.post('/auth/login', {
        email:    data.email.trim().toLowerCase(),
        password: data.password,
      })

      const payload = res.data?.data
      if (!payload?.accessToken) throw new Error('No token returned from server')

      // Verify it's a real JWT before storing
      if (payload.accessToken.split('.').length !== 3) {
        throw new Error('Server returned an invalid token format')
      }

      setAuth({
        token: payload.accessToken,
        user:  {
          id:    payload.user?.id,
          name:  payload.user?.name,
          email: payload.user?.email,
          role:  payload.user?.role,
        },
      })

      console.log('[Login] Real JWT stored. Subject email:', payload.user?.email)
      toast.success(`Welcome back, ${payload.user?.name ?? 'User'}!`)
      navigate('/dashboard')

    } catch (err) {
      const status = err?.response?.status
      const msg    = err?.response?.data?.error
                  || err?.response?.data?.message
                  || err?.message
                  || 'Login failed'

      if (status === 401) {
        setError('password', { message: 'Invalid email or password' })
        toast.error('Invalid email or password')
      } else if (status === 500) {
        // Backend 500 — likely user not found or DB issue
        toast.error('Server error during login. Check the Spring Boot console for details.')
        console.error('[Login] 500 error — check backend logs. Msg:', msg)
      } else if (!err?.response) {
        toast.error('Cannot reach backend — is Spring Boot running on port 8080?')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex font-dm">

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 border-r border-slate-800 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(#22d3ee 1px,transparent 1px),linear-gradient(90deg,#22d3ee 1px,transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-xl shadow-cyan-500/30">
            <Zap size={20} className="text-slate-950" fill="currentColor" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white font-syne">VoiceBill</span>
            <span className="block text-[10px] text-slate-500 tracking-widest uppercase">CRM Pro</span>
          </div>
        </div>

        <div className="relative space-y-5">
          <h2 className="font-syne text-4xl font-bold leading-tight text-white">
            Voice-powered billing.<br />
            <span className="text-cyan-400">Effortlessly smart.</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Generate invoices in ₹, manage customers, and process payments — all through natural voice commands.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {['Voice to Invoice', 'AI Intent Detection', 'Smart CRM', 'GST Billing'].map(f => (
              <span key={f} className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">{f}</span>
            ))}
          </div>
        </div>

        <div className="relative p-4 rounded-xl bg-slate-800/60 border border-slate-700">
          <p className="text-sm text-slate-300 italic">"Reduced invoice processing time by 70% in the first month."</p>
          <p className="mt-2 text-xs text-slate-500">— Sarah K., Finance Director</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center">
              <Zap size={17} className="text-slate-950" fill="currentColor" />
            </div>
            <span className="text-base font-bold text-white font-syne">VoiceBill CRM</span>
          </div>

          <h1 className="font-syne text-2xl font-bold text-white mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">Email Address</label>
              <input
                type="email" autoComplete="email" placeholder="you@example.com"
                {...register('email')}
                className={`w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-sm text-slate-200
                  placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition
                  ${errors.email ? 'border-rose-500/60' : 'border-slate-800 focus:border-cyan-500/60'}`}
              />
              {errors.email && <p className="mt-1.5 text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
                  {...register('password')}
                  className={`w-full px-4 py-2.5 pr-10 rounded-lg bg-slate-900 border text-sm text-slate-200
                    placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition
                    ${errors.password ? 'border-rose-500/60' : 'border-slate-800 focus:border-cyan-500/60'}`}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-rose-400">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
                bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 active:scale-[0.98]
                transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Register link */}
          <p className="mt-4 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition">
              Create one
            </Link>
          </p>

          {/* Registered users hint */}
          <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800">
            <p className="text-[11px] text-slate-500 text-center">
              Use the email and password you registered with.<br />
              You registered as: <span className="text-slate-300">padma@billingcrm.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}