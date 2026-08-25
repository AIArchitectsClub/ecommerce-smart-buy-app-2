import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signIn, getSession } from '../lib/authClient'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn.email({ email, password })
    setSubmitting(false)
    if (signInError) {
      setError(signInError.message || 'Sign in failed')
      return
    }
    // See the matching comment in SignUpPage.jsx — same race, same fix.
    await getSession()
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="page">
      <h1>Sign In</h1>
      <form className="checkout-form" style={{ maxWidth: 400 }} onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-row">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting} type="submit">
          {submitting ? 'Signing In…' : 'Sign In'}
        </button>
      </form>
      <p style={{ marginTop: 14 }}>
        Don't have an account?{' '}
        <Link to="/sign-up" state={location.state}>
          Sign up
        </Link>
      </p>
    </div>
  )
}
