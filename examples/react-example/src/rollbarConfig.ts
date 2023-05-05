import { Configuration } from "rollbar"

export const config: Configuration = {
  // It is not recommended to use the access token in clear, but using a server
  accessToken: __ROLLBAR_ACCESS_TOKEN__,
  captureUncaught: true,
  payload: {
    environment: process.env.NODE_ENV,
    client: {
      javascript: {
        source_map_enabled: true,
        code_version: __GIT_REVISION__,
        // Optionally have Rollbar guess which frames the error was thrown from
        // when the browser does not provide line and column numbers.
        guess_uncaught_frames: true,
      },
    },
  },
}
