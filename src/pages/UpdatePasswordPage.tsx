import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from '../lib/auth'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    const { error: authError } = await updatePassword(password)
    if (authError) {
      setError(authError.message)
    } else {
      navigate('/projects')
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Update Password</h1>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <input 
          type="password" 
          placeholder="New Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          minLength={8}
          style={{ padding: '10px' }}
        />
        <input 
          type="password" 
          placeholder="Confirm Password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          required 
          minLength={8}
          style={{ padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px' }}>Submit</button>
      </form>
    </div>
  )
}
