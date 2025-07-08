import { omit } from '@agentic/core'

import type * as types from './types'
import { TwitterError } from './error'

/**
 * Error handler which takes in an unknown Error object and converts it to a
 * structured TwitterError object for a set of common Twitter API errors.
 *
 * Re-throws the error if not recognized and will never return.
 */
export function handleTwitterError(
  err: unknown,
  { label = '' }: { label?: string } = {}
): never {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const error = err as any; // Temporarily cast to any for property access

  if (error.status === 403) {
    // user may have deleted the tweet we're trying to respond to
    throw new TwitterError(error.error?.detail || `${label}: 403 forbidden`, {
      type: 'twitter:forbidden',
      isFinal: true,
      cause: error
    })
  } else if (error.status === 401) {
    throw new TwitterError(`${label}: unauthorized`, {
      type: 'twitter:auth',
      cause: error
    })
  } else if (error.status === 400) {
    if (
      /value passed for the token was invalid/i.test(
        error.error?.error_description
      )
    ) {
      throw new TwitterError(`${label}: invalid auth token`, {
        type: 'twitter:auth',
        cause: error
      })
    }
  } else if (error.status === 429) {
    throw new TwitterError(`${label}: too many requests`, {
      type: 'twitter:rate-limit',
      cause: error
    })
  } else if (error.status === 404) {
    throw new TwitterError(String(error), {
      type: 'twitter:forbidden',
      isFinal: true,
      cause: error
    })
  }

  if (error.status >= 400 && error.status < 500) {
    throw new TwitterError(
      `${label}: ${error.status} ${error.error?.description || String(error)}`,
      {
        type: 'twitter:unknown',
        isFinal: true,
        cause: error
      }
    )
  } else if (error.status >= 500) {
    throw new TwitterError(
      `${label}: ${error.status} ${error.error?.description || String(error)}`,
      {
        type: 'twitter:unknown',
        isFinal: false,
        cause: error
      }
    )
  }

  const reason = String(error).toLowerCase()

  if (reason.includes('fetcherror') || reason.includes('enotfound')) {
    throw new TwitterError(String(error), {
      type: 'network',
      cause: error
    })
  }

  // Otherwise, propagate the original error
  throw error
}

export function getPrunedTweet(
  tweet: Partial<types.Tweet>
): Partial<types.Tweet> {
  const urls = tweet.entities?.urls
  let text = tweet.text

  if (text && urls) {
    for (const url of urls) {
      if (url.expanded_url && url.url) {
        text = text!.replaceAll(url.url, url.expanded_url!)
      }
    }
  }

  return {
    ...omit(
      tweet,
      'conversation_id',
      'public_metrics',
      'created_at',
      'entities',
      'possibly_sensitive'
    ),
    text
  }
}

export function getPrunedTwitterUser(
  twitterUser: Partial<types.TwitterUser>
): Partial<types.TwitterUser> {
  const urls = twitterUser.entities?.description?.urls
  let description = twitterUser.description

  if (description && urls) {
    for (const url of urls) {
      if (url.expanded_url && url.url) {
        description = description!.replaceAll(url.url, url.expanded_url!)
      }
    }
  }

  return {
    ...omit(
      twitterUser,
      'public_metrics',
      'created_at',
      'verified',
      'protected',
      'url',
      'entities'
    ),
    description
  }
}
