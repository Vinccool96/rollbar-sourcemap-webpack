module.exports = {
  presets: [["@babel/preset-env", { targets: { node: "current" } }], "@babel/preset-typescript"],
  plugins: [
    "@babel/plugin-syntax-flow",
    [
      "@babel/plugin-transform-react-jsx",
      {
        throwIfNamespace: false, // defaults to true
        runtime: "automatic", // defaults to classic
        importSource: "custom-jsx-library", // defaults to react
      },
    ],
  ],
}
