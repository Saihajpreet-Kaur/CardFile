import { Check, Circle, LogIn, Sparkles, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Brand';
import { useAuth } from '../context/AuthContext';

const PASSWORD_RULES = [
  { test: (value) => value.length >= 8, label: 'At least 8 characters' },
  { test: (value) => /[A-Z]/.test(value), label: 'An uppercase letter' },
  { test: (value) => /[a-z]/.test(value), label: 'A lowercase letter' },
  { test: (value) => /\d/.test(value), label: 'A number' },
];

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-rise">
        <a href="/" className="mb-8 flex justify-center transition hover:scale-105">
          <Logo />
        </a>
        <div className="card relative overflow-hidden p-8 shadow-[0_30px_80px_-30px_rgb(24_35_61/0.45)]">
          {/* Index-card look: blue tab and red margin line, like the logo */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-400 to-danger" />
          <div className="absolute -top-16 -right-16 size-40 rounded-full bg-brand-200/50 blur-3xl" />
          <p className="relative flex items-center gap-1.5 text-sm font-semibold text-brand-600">
            <Sparkles size={14} /> Cardfile
          </p>
          <h1 className="relative mt-1 text-[28px] font-extrabold tracking-[-0.03em]">{title}</h1>
          <p className="relative mt-1 mb-7 text-sm text-muted">{subtitle}</p>
          <div className="relative">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </div>
    </div>
  );
}

/** Shared form logic: controlled inputs, submit state and server errors per field. */
function useAuthForm(initial, submit) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const onChange = (event) => setValues((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await submit(values);
    } catch (error) {
      const fieldErrors = Array.isArray(error.details)
        ? Object.fromEntries(error.details.map((detail) => [detail.field, detail.message]))
        : {};
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? '' : error.message });
      setBusy(false);
    }
  };

  return { values, setValues, errors, busy, onChange, onSubmit };
}

function Field({ label, name, error, ...props }) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} className={`input ${error ? 'input-error' : ''}`} {...props} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const goTo = location.state?.from?.pathname ?? '/dashboard';

  const { values, setValues, errors, busy, onChange, onSubmit } = useAuthForm({ email: '', password: '' }, async (form) => {
    await signIn(form);
    navigate(goTo, { replace: true });
  });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your contacts."
      footer={
        <>
          New here?{' '}
          <Link className="font-semibold text-brand-600" to="/signup">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} error={errors.email} required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" value={values.password} onChange={onChange} error={errors.password} required />
        {errors.form && <p className="field-error text-sm">{errors.form}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          <LogIn size={16} /> {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          type="button"
          className="btn btn-ghost w-full"
          onClick={() => setValues({ email: 'demo@crm.test', password: 'Demo@1234' })}
        >
          Fill in the demo account
        </button>
      </form>
    </AuthShell>
  );
}

export function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const { values, errors, busy, onChange, onSubmit } = useAuthForm({ name: '', email: '', password: '' }, async (form) => {
    await signUp(form);
    navigate('/dashboard', { replace: true });
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start organising your contacts in a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link className="font-semibold text-brand-600" to="/signin">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Name" name="name" autoComplete="name" value={values.name} onChange={onChange} error={errors.name} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} error={errors.email} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={onChange} error={errors.password} />
        <ul className="grid grid-cols-2 gap-1.5 text-xs">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(values.password);
            return (
              <li key={rule.label} className={`flex items-center gap-1.5 font-medium transition-colors ${ok ? 'text-emerald-600' : 'text-faint'}`}>
                {ok ? <Check size={13} strokeWidth={3} /> : <Circle size={12} />} {rule.label}
              </li>
            );
          })}
        </ul>
        {errors.form && <p className="field-error text-sm">{errors.form}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !PASSWORD_RULES.every((rule) => rule.test(values.password))}>
          <UserPlus size={16} /> {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
