import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { signUp } from '../lib/auth'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    const { error: authError } = await signUp(email, password)
    if (authError) {
      setError(authError.message)
    } else {
      setMessage('Check your email to confirm your account before signing in.')
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Sign Up</h1>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      {message && <div style={{ color: 'green', marginBottom: '10px' }}>{message}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '10px' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          minLength={8}
          style={{ padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px' }}>Submit</button>
      </form>
      <div style={{ marginTop: '20px' }}>
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  )
}
