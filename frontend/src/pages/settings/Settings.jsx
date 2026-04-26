import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings, Store, Mail, Shield, Upload, Save,
  Loader2, CheckCircle2, Eye, EyeOff, AlertCircle
} from 'lucide-react'
import Button from '../../components/ui/Button'
import backendClient from '../../api/axios'
import toast from 'react-hot-toast'

const api = {
  get:    () => backendClient.get('/settings').then(r => r.data?.data),
  update: (d) => backendClient.put('/settings', d).then(r => r.data?.data),
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
        <Icon size={16} className="text-cyan-400" />
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-600">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', ...rest }) {
  return (
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} {...rest}
      className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm
        text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
        focus:ring-cyan-500/40 focus:border-cyan-500/40 transition" />
  )
}

export default function ShopSettings() {
  const qc = useQueryClient()
  const logoRef = useRef(null)
  const [showSmtpPwd, setShowSmtpPwd] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['shop-settings'],
    queryFn: api.get,
    staleTime: 60_000,
  })

  const [form, setForm] = useState(null)

  // Initialise form from query data
  if (data && !form) setForm({ ...data })

  const mutation = useMutation({
    mutationFn: api.update,
    onSuccess: (updated) => {
      qc.setQueryData(['shop-settings'], updated)
      toast.success('Settings saved')
    },
  })

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500_000) { toast.error('Logo must be under 500 KB'); return }
    const reader = new FileReader()
    reader.onload = () => set('logoBase64')(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (!form) return
    mutation.mutate(form)
  }

  const handleTestEmail = async () => {
    if (!form?.smtpHost || !form?.smtpUsername) {
      toast.error('Configure SMTP settings first'); return
    }
    setTestingEmail(true)
    try {
      await backendClient.post('/settings/test-email', { to: form.email })
      toast.success('Test email sent! Check your inbox.')
    } catch { /* handled */ }
    finally { setTestingEmail(false) }
  }

  if (isLoading || !form) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={24} className="animate-spin text-slate-600" />
    </div>
  )

  return (
    <div className="space-y-6 font-dm max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Shop Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure your shop profile and invoice preferences</p>
        </div>
        <Button icon={Save} loading={mutation.isPending} onClick={handleSave}>
          Save Settings
        </Button>
      </div>

      {mutation.isSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 size={16} /> Settings saved successfully
        </div>
      )}

      {/* ── Shop Profile ── */}
      <Section icon={Store} title="Shop Profile">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Shop / Business Name *">
              <Input value={form.shopName} onChange={set('shopName')} placeholder="My Electronics Store" />
            </Field>
          </div>
          <Field label="GST Number (GSTIN)" hint="15-character GST registration number">
            <Input value={form.gstNumber} onChange={set('gstNumber')} placeholder="22AAAAA0000A1Z5" />
          </Field>
          <Field label="Phone Number">
            <Input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          </Field>
          <div className="col-span-2">
            <Field label="Email Address">
              <Input value={form.email} onChange={set('email')} type="email" placeholder="shop@example.com" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Shop Address">
              <textarea value={form.address ?? ''} rows={2}
                onChange={e => set('address')(e.target.value)}
                placeholder="Street address, building number"
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm
                  text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
                  focus:ring-cyan-500/40 resize-none" />
            </Field>
          </div>
          <Field label="City">
            <Input value={form.city} onChange={set('city')} placeholder="Chennai" />
          </Field>
          <Field label="State">
            <Input value={form.state} onChange={set('state')} placeholder="Tamil Nadu" />
          </Field>
          <Field label="PIN Code">
            <Input value={form.pincode} onChange={set('pincode')} placeholder="600001" />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={set('website')} placeholder="https://myshop.com" />
          </Field>
        </div>
      </Section>

      {/* ── Logo ── */}
      <Section icon={Upload} title="Shop Logo">
        <div className="flex items-start gap-5">
          {form.logoBase64 ? (
            <div className="relative">
              <img src={form.logoBase64} alt="Logo" className="w-20 h-20 rounded-xl object-contain bg-slate-800 border border-slate-700" />
              <button onClick={() => set('logoBase64')(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-xs hover:bg-rose-400 transition">
                ×
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-slate-800 border border-slate-700 border-dashed flex items-center justify-center text-slate-600">
              <Store size={24} />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <Button variant="secondary" size="sm" icon={Upload} onClick={() => logoRef.current?.click()}>
              Upload Logo
            </Button>
            <p className="text-[11px] text-slate-600">PNG, JPG or SVG. Max 500 KB. Appears on PDF invoices.</p>
          </div>
        </div>
      </Section>

      {/* ── Invoice Settings ── */}
      <Section icon={Shield} title="Invoice & GST Settings">
        <div className="grid grid-cols-3 gap-4">
          <Field label="CGST Label">
            <Input value={form.cgstLabel} onChange={set('cgstLabel')} placeholder="CGST" />
          </Field>
          <Field label="SGST Label">
            <Input value={form.sgstLabel} onChange={set('sgstLabel')} placeholder="SGST" />
          </Field>
          <Field label="IGST Label">
            <Input value={form.igstLabel} onChange={set('igstLabel')} placeholder="IGST" />
          </Field>
        </div>
        <Field label="Invoice Footer Note" hint="Appears at the bottom of every PDF invoice">
          <textarea value={form.invoiceFooterNote ?? ''} rows={3}
            onChange={e => set('invoiceFooterNote')(e.target.value)}
            placeholder="Thank you for your business! Payment is due within 30 days."
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm
              text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
              focus:ring-cyan-500/40 resize-none" />
        </Field>
      </Section>

      {/* ── Email / SMTP ── */}
      <Section icon={Mail} title="Email Settings (SMTP)">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-slate-400">Enable invoice email delivery</p>
          <button
            onClick={() => set('emailEnabled')(!form.emailEnabled)}
            className={`w-11 h-6 rounded-full transition-all duration-200 relative ${
              form.emailEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
              form.emailEnabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>

        {form.emailEnabled && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
              <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                For Gmail: enable 2FA → create an App Password at myaccount.google.com/apppasswords. Use that as the SMTP password.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="SMTP Host" hint="e.g. smtp.gmail.com">
                <Input value={form.smtpHost} onChange={set('smtpHost')} placeholder="smtp.gmail.com" />
              </Field>
              <Field label="SMTP Port" hint="Usually 587 (TLS) or 465 (SSL)">
                <Input value={form.smtpPort} onChange={set('smtpPort')} type="number" placeholder="587" />
              </Field>
              <div className="col-span-2">
                <Field label="SMTP Username / Email">
                  <Input value={form.smtpUsername} onChange={set('smtpUsername')} type="email" placeholder="yourshop@gmail.com" />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="SMTP Password / App Password">
                  <div className="relative">
                    <input
                      type={showSmtpPwd ? 'text' : 'password'}
                      value={form.smtpPassword ?? ''}
                      onChange={e => set('smtpPassword')(e.target.value)}
                      placeholder="Gmail App Password (16 chars)"
                      className="w-full px-3 py-2.5 pr-10 rounded-lg bg-slate-800 border border-slate-700 text-sm
                        text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                    <button type="button" onClick={() => setShowSmtpPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showSmtpPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </Field>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button variant="secondary" size="sm" loading={testingEmail} onClick={handleTestEmail}>
                Send Test Email
              </Button>
              <p className="text-xs text-slate-500">Sends a test to <span className="text-slate-300">{form.email || 'your shop email'}</span></p>
            </div>
          </div>
        )}
      </Section>

      <div className="flex justify-end pb-4">
        <Button icon={Save} size="lg" loading={mutation.isPending} onClick={handleSave}>
          Save All Settings
        </Button>
      </div>
    </div>
  )
}