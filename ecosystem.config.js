module.exports = {
  apps: [
    {
      name: 'jft',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8765,
      },
    },
  ],
};
