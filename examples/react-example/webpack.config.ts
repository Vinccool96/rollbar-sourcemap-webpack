import { Configuration, DefinePlugin } from "webpack"

import * as path from "path"
import * as cp from "child_process"

import * as HtmlWebpackPlugin from "html-webpack-plugin"
import S3Plugin from "webpack-s3-plugin"
import { RollbarSourceMap } from "rollbar-sourcemap-webpack"

const rollbarClientAccessToken = process.env.ROLLBAR_CLIENT_TOKEN
const rollbarServerAccessToken = process.env.ROLLBAR_SERVER_TOKEN
const bucket = process.env.AWS_S3_BUCKET
const s3Options = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
}
const basePath = "assets"
const publicPath = `https://s3-${s3Options.region}.amazonaws.com/${bucket}/${basePath}`
let version: string

try {
  version = cp.execSync("git rev-parse HEAD", {
    cwd: __dirname,
    encoding: "utf8",
  })
} catch (err) {
  console.log("Error getting revision", err) // eslint-disable-line no-console
  process.exit(1)
}

const config: Configuration = {
  mode: "production",
  devtool: "hidden-source-map",
  entry: {
    app: "./src/index",
  },
  output: {
    path: path.join(__dirname, "dist"),
    publicPath,
    filename: "[name]-[chunkhash].js",
    chunkFilename: "[name]-[chunkhash].js",
  },
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: "initial",
    },
  },
  plugins: [
    new DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
      __ROLLBAR_ACCESS_TOKEN__: JSON.stringify(rollbarClientAccessToken),
      __GIT_REVISION__: JSON.stringify(version),
    }),
    new HtmlWebpackPlugin({ template: "src/index.html" }),
    // Publish minified source
    new S3Plugin({
      include: /\.js$/,
      basePath,
      s3Options,
      s3UploadOptions: {
        Bucket: bucket,
        ACL: "public-read",
        ContentType: "application/javascript",
      },
    }),
    // Publish sourcemap, but keep it private
    new S3Plugin({
      include: /\.map$/,
      basePath: `${basePath}`,
      s3Options,
      s3UploadOptions: {
        Bucket: bucket,
        ACL: "private",
        ContentType: "application/json",
      },
    }),
    // Upload emitted sourcemaps to rollbar
    new RollbarSourceMap({
      accessToken: rollbarServerAccessToken,
      version,
      publicPath,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        include: path.join(__dirname, "src"),
        use: [
          {
            loader: "babel-loader",
            options: {
              babelrc: false,
              presets: ["@babel/preset-react", ["@babel/preset-env", { targets: { browsers: ["last 2 versions"] } }]],
            },
          },
        ],
      },
    ],
  },
}

export default config
