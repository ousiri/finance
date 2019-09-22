

module.exports = {
  devServer: {
    disableHostCheck: true,
    port: 11000,
    proxy: {
      '/api/': {
        target: 'http://localhost:7001'
      }
    }
  }
}
