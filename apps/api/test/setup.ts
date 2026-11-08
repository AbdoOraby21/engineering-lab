process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.BCRYPT_ROUNDS = '4';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-1234567890';
process.env.JWT_ACCESS_TTL_SECONDS = '900';
process.env.REFRESH_TOKEN_TTL_DAYS = '7';
process.env.COOKIE_SECURE = 'false';
process.env.WEB_URL = 'http://localhost:5173';
process.env.WEB_ORIGIN = 'http://localhost:5173';
process.env.RATE_LIMIT_MAX = '10000';
process.env.AUTH_RATE_LIMIT_MAX = '10000';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres@127.0.0.1:55433/engineering_lab_test?schema=public';

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED_REJECTION:', reason);
});
