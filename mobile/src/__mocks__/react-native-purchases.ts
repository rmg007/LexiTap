// Manual Jest mock so tests never load the native RevenueCat SDK.
// Mapped in jest.config.js via moduleNameMapper.

export const mockCustomerInfo = {
  entitlements: {
    active: {} as Record<string, { identifier: string; isActive: boolean }>,
    all: {} as Record<string, { identifier: string; isActive: boolean }>,
  },
  activeSubscriptions: [] as string[],
  allPurchasedProductIdentifiers: [] as string[],
  nonSubscriptionTransactions: [] as unknown[],
  latestExpirationDate: null,
  firstSeen: '2024-01-01T00:00:00Z',
  originalAppUserId: 'anon',
  requestDate: '2024-01-01T00:00:00Z',
  originalApplicationVersion: null,
  originalPurchaseDate: null,
  managementURL: null,
  nonSubscriptions: {},
};

export const mockOfferings = {
  current: {
    identifier: 'default',
    serverDescription: '',
    availablePackages: [] as unknown[],
    lifetime: null,
    annual: null,
    sixMonth: null,
    threeMonth: null,
    twoMonth: null,
    monthly: null,
    weekly: null,
    metadata: {},
  },
  all: {} as Record<string, unknown>,
};

const Purchases = {
  configure: jest.fn(),
  getOfferings: jest.fn().mockResolvedValue(mockOfferings),
  purchasePackage: jest.fn().mockResolvedValue({
    productIdentifier: 'com.lexitap.exam.toefl',
    customerInfo: mockCustomerInfo,
    transaction: { transactionIdentifier: 'txn_mock_123' },
  }),
  restorePurchases: jest.fn().mockResolvedValue(mockCustomerInfo),
  getCustomerInfo: jest.fn().mockResolvedValue(mockCustomerInfo),
  logIn: jest.fn().mockResolvedValue({ customerInfo: mockCustomerInfo, created: false }),
  logOut: jest.fn().mockResolvedValue(mockCustomerInfo),
  addCustomerInfoUpdateListener: jest.fn(),
  removeCustomerInfoUpdateListener: jest.fn(),
};

export const PURCHASES_ERROR_CODE = {
  PURCHASE_CANCELLED_ERROR: '1',
  INVALID_CREDENTIALS_ERROR: '2',
  INVALID_APP_USER_ID_ERROR: '3',
  OPERATION_ALREADY_IN_PROGRESS_ERROR: '4',
  UNKNOWN_BACKEND_ERROR: '5',
  INVALID_APPLE_SUBSCRIPTION_KEY_ERROR: '6',
  INELIGIBLE_ERROR: '7',
  INSUFFICIENT_PERMISSIONS_ERROR: '8',
  PAYMENT_PENDING_ERROR: '9',
  INVALID_SUBSCRIBER_ATTRIBUTES_ERROR: '10',
  STORE_PROBLEM_ERROR: '13',
  INVALID_PURCHASE_ERROR: '14',
  NETWORK_ERROR: '15',
  UNKNOWN_ERROR: '16',
};

export const LOG_LEVEL = {
  VERBOSE: 'VERBOSE',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SILENT: 'SILENT',
};

export default Purchases;
