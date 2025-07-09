import { getEnv } from '@agentic/core'
import { Nango } from '@nangohq/node'
import type { DBConnection } from '@nangohq/types'
import { z } from 'zod'

// This is intentionally left as a global singleton to avoid re-creating the
// Nango connection instance on successive calls in serverless environments.
let _nango: Nango | null = null

/**
 * Retrieve the singleton Nango client, initializing it if necessary.
 * @returns The Nango API client.
 * @throws If the NANGO_SECRET_KEY env var is missing or empty.
 */
export function getNango(): Nango {
  if (!_nango) {
    const secretKey = getEnv('NANGO_SECRET_KEY')?.trim()
    if (!secretKey) {
      throw new Error('Missing required "NANGO_SECRET_KEY"')
    }
    // Optional override for self-hosted or staging endpoints
    const baseUrl = getEnv('NANGO_BASE_URL')?.trim()
    const options = baseUrl ? { secretKey, baseUrl } : { secretKey }
    _nango = new Nango(options)
  }
  return _nango
}

/**
 * Ensures a Nango DBConnection has all required OAuth scopes.
 * @param connection The DBConnection object from Nango.
 * @param scopes List of scopes that must be present.
 * @throws If the credentials shape is invalid or any scope is missing.
 */
export function validateNangoConnectionOAuthScopes({
  connection,
  scopes
}: {
  connection: DBConnection
  scopes: string[]
}) {
  // Validate credentials shape
  const credentialsSchema = z.object({
    raw: z.object({ scope: z.string() })
  })
  const { raw: { scope } } = credentialsSchema.parse(connection.credentials)

  const connectionScopes = new Set(scope.split(' '))
  const missing = scopes.filter(s => !connectionScopes.has(s))
  if (missing.length > 0) {
    throw new Error(
      `Nango connection ${connection.id} missing OAuth scopes: ${missing.join(', ')}`
    )
  }
}
