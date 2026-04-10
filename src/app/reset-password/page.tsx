"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.")
      return
    }

    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Ein Fehler ist aufgetreten.")
        setLoading(false)
        return
      }

      router.push("/login?reset=success")
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.")
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="mb-4 text-red-600">Ungültiger Link. Bitte fordere einen neuen Link an.</p>
        <Link href="/forgot-password" className="text-blue-600 hover:underline">
          Neuen Link anfordern
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="mb-4 text-gray-600">Gib dein neues Passwort ein.</p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="mb-4">
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          Neues Passwort
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">
          Passwort bestätigen
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Wird gespeichert..." : "Passwort zurücksetzen"}
      </button>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          Zurück zum Login
        </Link>
      </div>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Passwort zurücksetzen</h1>
        <Suspense fallback={<div>Laden...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
