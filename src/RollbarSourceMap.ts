import { promises as fs } from "fs"
import { join } from "path"
import { STATUS_CODES } from "http"

import { Compilation, Compiler } from "webpack"
import fetch, { Response, FetchError } from "node-fetch"
import { Blob, FormData } from "formdata-node"
import isString from "lodash.isstring"
import VError from "verror"

import { handleError, validateOptions } from "./helpers"
import { PLUGIN_NAME, ROLLBAR_ENDPOINT } from "./constants"

export type RollbarSourceMapOptions = {
  accessToken: string | ((...args: any[]) => any)

  version: string | ((...args: any[]) => any)

  publicPath: string | ((...args: any[]) => any)

  includeChunks?: Array<string> | string

  silent?: boolean

  ignoreErrors?: boolean

  rollbarEndpoint?: string

  encodeFilename?: boolean
}

export type SimplifiedChunk = {
  sourceFile: string
  sourceMap: string
}

function getDetailsFromStatus(res: Response): string {
  const statusText = res.statusText
  if (statusText !== "") {
    return `${res.status} - ${statusText}`
  } else {
    const status = res.status
    const statusTextOfCode = STATUS_CODES[status]
    if (typeof statusTextOfCode !== "undefined") {
      return `${status} - ${statusTextOfCode}`
    } else {
      return `${status} - Unknown Status Code`
    }
  }
}

export class RollbarSourceMap {
  accessToken: string | ((...args: any[]) => any)

  version: string | ((...args: any[]) => any)

  publicPath: string | ((...args: any[]) => any)

  includeChunks: Array<string>

  silent: boolean

  ignoreErrors: boolean

  rollbarEndpoint: string

  encodeFilename: boolean

  constructor(options: RollbarSourceMapOptions) {
    const {
      accessToken,
      version,
      publicPath,
      includeChunks = [],
      silent = false,
      ignoreErrors = false,
      rollbarEndpoint = ROLLBAR_ENDPOINT,
      encodeFilename = false,
    } = options
    this.accessToken = accessToken
    this.version = version
    this.publicPath = publicPath
    this.includeChunks = isString(includeChunks) ? [includeChunks] : [...includeChunks]
    this.silent = silent
    this.ignoreErrors = ignoreErrors
    this.rollbarEndpoint = rollbarEndpoint
    this.encodeFilename = encodeFilename
  }

  async afterEmit(compilation: Compilation) {
    const errors = validateOptions(this)

    if (errors) {
      compilation.errors.push(...handleError(errors))
      return
    }

    try {
      await this.uploadSourceMaps(compilation)
    } catch (err) {
      if (!this.ignoreErrors) {
        compilation.errors.push(...handleError(err as Error))
      } else if (!this.silent) {
        compilation.warnings.push(...handleError(err as Error))
      }
    }
  }

  apply(compiler: Compiler) {
    compiler.hooks.afterEmit.tapPromise(PLUGIN_NAME, this.afterEmit.bind(this))
  }

  getAssetPath(compilation: Compilation, name: string) {
    return join(compilation.getPath(compilation.compiler.outputPath), name.split("?")[0])
  }

  getSource(compilation: Compilation, name: string) {
    const path = this.getAssetPath(compilation, name)
    return fs.readFile(path, { encoding: "utf-8" })
  }

  getAssets(compilation: Compilation): Array<SimplifiedChunk> {
    const { includeChunks, encodeFilename } = this
    const { chunks = [] } = compilation.getStats().toJson()

    return chunks.reduce((result, chunk) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const chunkName = chunk.names![0]
      if (includeChunks.length && includeChunks.indexOf(chunkName) === -1) {
        return result
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const sourceFile = chunk.files!.find((file) => /\.js$/.test(file)) as string

      // webpack 5 stores source maps in `chunk.auxiliaryFiles` while webpack 4
      // stores them in `chunk.files`. This allows both webpack versions to work
      // with this plugin.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const sourceMap = (chunk.auxiliaryFiles || chunk.files)!.find((file) => /\.js\.map$/.test(file)) as string

      if (!sourceFile || !sourceMap) {
        return result
      }

      return [
        ...result,
        {
          sourceFile: encodeFilename ? encodeURI(sourceFile) : sourceFile,
          sourceMap,
        },
      ]
    }, [] as Array<SimplifiedChunk>)
  }

  getPublicPath(sourceFile: string) {
    if (isString(this.publicPath)) {
      const sep = this.publicPath.endsWith("/") ? "" : "/"
      return `${this.publicPath}${sep}${sourceFile}`
    }
    return this.publicPath(sourceFile)
  }

  async uploadSourceMap(compilation: Compilation, { sourceFile, sourceMap }: SimplifiedChunk) {
    const errMessage = `failed to upload ${sourceMap} to Rollbar`
    let sourceMapSource: string

    try {
      sourceMapSource = await this.getSource(compilation, sourceMap)
    } catch (err) {
      throw new VError(err as Error, errMessage)
    }

    const form = new FormData()
    form.append("access_token", this.accessToken)
    form.append("version", this.version)
    form.append("minified_url", this.getPublicPath(sourceFile))
    const sourceMapSourceBlob = new Blob([sourceMapSource], { type: "application/json" })
    form.append("source_map", sourceMapSourceBlob)

    let res: Response
    try {
      res = await fetch(this.rollbarEndpoint, {
        method: "POST",
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        body: form,
      })
    } catch (err) {
      // Network or operational errors
      throw new VError(err as FetchError, errMessage)
    }

    // 4xx or 5xx response
    if (!res.ok) {
      // Attempt to parse error details from response
      let details: string
      try {
        const body = (await res.json()) as { message?: string | null } | undefined
        const message = body?.message
        if (typeof message !== "undefined" && message !== null) {
          details = message
        } else {
          details = getDetailsFromStatus(res)
        }
      } catch (parseErr) {
        details = getDetailsFromStatus(res)
      }

      throw new Error(`${errMessage}: ${details}`)
    }

    // Success
    if (!this.silent) {
      // eslint-disable-next-line no-console
      console.info(`Uploaded ${sourceMap} to Rollbar`)
    }
  }

  uploadSourceMaps(compilation: Compilation) {
    const assets = this.getAssets(compilation)

    if (assets.length > 0) {
      process.stdout.write("\n")
    }
    return Promise.all(assets.map((asset) => this.uploadSourceMap(compilation, asset)))
  }
}
