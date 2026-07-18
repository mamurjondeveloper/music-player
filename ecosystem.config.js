module.exports = {
  apps: [
    {
      name: 'symphony-backend',
      cwd: './backend',
      script: 'dist/main.js',
      env: {
        PORT: 4000,
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'super_secret_music_jwt_key_12345',
        NODE_ENV: 'production',
      },
    },
    {
      name: 'symphony-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
    },
  ],
};
