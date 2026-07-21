import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../lib/auth'

export default function PasswordResetPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const { error: authError } = await resetPassword(email)
    if (authError) {
      setError(authError.message)
    } else {
      setMessage('If that email is registered, a reset link has been sent.')
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Reset Password</h1>
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
        <button type="submit" style={{ padding: '10px' }}>Submit</button>
      </form>
      <div style={{ marginTop: '20px' }}>
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  )
}
