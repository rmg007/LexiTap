// Manual Jest mock so tests never load the native Sentry module. Mapped in
// jest.config.js via moduleNameMapper. `wrap` is the identity function so a
// wrapped root component renders unchanged under test.
export const init = jest.fn();
export const wrap = <T>(component: T): T => component;
export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const setTag = jest.fn();
export const setUser = jest.fn();
export const addBreadcrumb = jest.fn();
