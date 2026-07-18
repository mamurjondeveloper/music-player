module.exports = {
  apps: [
    {
      name: 'symphony-backend',
      cwd: './backend',
      script: 'dist/src/main.js',
      env: {
        PORT: 4005,
        DATABASE_URL: 'file:/var/www/music-player/backend/prisma/dev.db',
        JWT_SECRET: 'super_secret_music_jwt_key_12345',
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
