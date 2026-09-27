export const environment = {
  production: false,
  pocketbaseUrl:
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port === '4200'
      ? 'http://localhost:8090'
      : '/'
};
