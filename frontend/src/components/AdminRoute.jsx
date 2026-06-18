import React from 'react'
import { Navigate } from 'react-router-dom'

export default function AdminRoute({ user, children }) {
  if (!user || !user.is_admin) {
    return <Navigate to="/" replace />
  }
  return children
}
