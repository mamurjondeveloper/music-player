module.exports = {
  apps: [
    {
      name: 'symphony-backend',
      cwd: './backend',
      script: 'dist/src/main.js',
      // JWT_SECRET, DATABASE_URL and INVITE_CODE are intentionally NOT set here — they must
      // live only in backend/.env on the server (git-ignored) so real secrets never end up
      // committed to this file, which is tracked in git.
      env: {
        PORT: 4005,
        NODE_ENV: 'production',
      },
    },
    {
      name: 'symphony-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      env: {
        PORT: 3005,
        NODE_ENV: 'production',
      },
    },
  ],
};
