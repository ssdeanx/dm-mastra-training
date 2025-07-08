import { getEnv } from '@agentic/core'
import { Nango } from '@nangohq/node'
import type { Connection } from '@nangohq/node/dist/types/types'; // Assuming this is the correct path based on common patterns

// This is intentionally left as a global singleton to avoid re-creating the
// Nango connection instance on successive calls in serverless environments.
let _nango: Nango | null = null

export function getNango(): Nango {
  if (!_nango) {
    const secretKey = getEnv('NANGO_SECRET_KEY')?.trim()
    if (!secretKey) {
      throw new Error(`Missing required "NANGO_SECRET_KEY"`)
    }

    _nango = new Nango({ secretKey })
  }

  return _nango
}

export function validateNangoConnectionOAuthScopes({
  connection,
  scopes
}: {
  connection: Connection
  scopes: string[]
}) {
  const connectionScopes = new Set<string>(
    (connection.credentials as { raw: { scope: string } }).raw.scope.split(' ')
  )
  const missingScopes = new Set<string>()

  for (const scope of scopes) {
    if (!connectionScopes.has(scope)) {
      missingScopes.add(scope)
    }
  }

  if (missingScopes.size > 0) {
    throw new Error(
      `Nango connection ${connection.id} is missing required OAuth scopes: ${[
        ...missingScopes.values()
      ].join(', ')}`
    )
  }
}
