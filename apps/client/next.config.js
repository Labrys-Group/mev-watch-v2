/** @type {import('next').NextConfig} */

const withTM = require("next-transpile-modules")([
  "consts",
  "database"
])

const nextConfig = withTM({
  reactStrictMode: true,
  swcMinify: true,
})

module.exports = nextConfig
