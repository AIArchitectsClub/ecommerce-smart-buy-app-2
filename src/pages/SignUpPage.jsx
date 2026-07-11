import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signUp } from '../lib/authClient'

export default function SignUpPage() {
  const [name, setName] = useState('')
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
    const { error: signUpError } = await signUp.email({ name, email, password })
    setSubmitting(false)
    if (signUpError) {
      setError(signUpError.message || 'Sign up failed')
      return
    }
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="page">
      <h1>Create an Account</h1>
      <form className="checkout-form" style={{ maxWidth: 400 }} onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-row">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
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
            minLength={8}
            required
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting} type="submit">
          {submitting ? 'Creating Account…' : 'Sign Up'}
        </button>
      </form>
      <p style={{ marginTop: 14 }}>
        Already have an account? <Link to="/sign-in">Sign in</Link>
      </p>
    </div>
  )
}
