import { WebpackError } from "webpack"
import VError from "verror"
import isFunction from "lodash.isfunction"
import isString from "lodash.isstring"

import { PLUGIN_NAME, ROLLBAR_REQ_FIELDS } from "./constants"

// Take a single Error or array of Errors and return an array of errors that
// have message prefixed.
export function handleError(err: Error | Array<Error> | null, prefix = PLUGIN_NAME) {
  if (!err) {
    return []
  }

  const errors = Array.isArray(err) ? new Array<Error>().concat(...err) : new Array<Error>().concat(err)
  return errors.map((e) => new VError(e, prefix) as WebpackError)
}

export interface Ref {
  accessToken: string | ((...args: any[]) => any)
  version: string | ((...args: any[]) => any)
  publicPath: string | ((...args: any[]) => any)
}

// Validate required options and return an array of errors or null if there
// are no errors.
export function validateOptions(ref: Ref | null): Array<WebpackError> | null {
  let errors: Array<WebpackError> = []

  for (const field of ROLLBAR_REQ_FIELDS) {
    if (field === "publicPath" && ref?.[field] && !isString(ref[field]) && !isFunction(ref[field])) {
      errors = [...errors, new TypeError(`invalid type. '${field}' expected to be string or function.`) as WebpackError]
      continue
    }

    if (ref?.[field]) {
      continue
    }

    errors = [...errors, new WebpackError(`required field, '${field}', is missing.`)]
  }

  return errors.length ? errors : null
}
