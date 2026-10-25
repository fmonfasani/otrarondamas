# Wapsell Mobile App

React Native mobile application for Wapsell - multi-tenant B2B e-commerce platform.

## Quick Start

### Prerequisites
- Node.js 18+
- React Native CLI
- iOS: Xcode 14+
- Android: Android Studio + SDK

### Installation

```bash
# Install dependencies
npm install

# Install pods (iOS)
cd ios && pod install && cd ..

# Set up environment
cp .env.example .env
```

### Development

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

### Directory Structure

```
src/
├── screens/          # Screen components
│   ├── auth/         # Login, SignUp
│   ├── home/         # Products, ProductDetail, Search
│   ├── cart/         # Cart, Checkout, OrderConfirmation
│   └── profile/      # Profile, OrderHistory, Settings
├── navigation/       # Navigation stacks & routers
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   ├── MainTabNavigator.tsx
│   └── stacks/       # Stack navigators
├── services/         # API & external services
│   └── apiService.ts # Axios instance with interceptors
├── stores/           # Zustand state management
│   ├── authStore.ts
│   ├── cartStore.ts
│   └── userStore.ts
├── types/            # TypeScript interfaces
│   └── index.ts      # Domain models
├── components/       # Reusable UI components
├── utils/            # Helper functions
└── __tests__/        # Unit & integration tests
```

## State Management

### Zustand Stores

#### AuthStore
- **Purpose**: User authentication & authorization
- **State**: `user`, `token`, `refreshToken`, `isLoading`, `error`
- **Actions**: `login()`, `signup()`, `logout()`, `refreshAccessToken()`, `loadStoredAuth()`
- **Persistence**: AsyncStorage for tokens and user data

#### CartStore
- **Purpose**: Shopping cart management
- **State**: `items[]`, `totalItems`, `totalPrice`
- **Actions**: `addItem()`, `removeItem()`, `updateQuantity()`, `clearCart()`
- **No Persistence**: Cart is session-based

#### UserStore
- **Purpose**: User profile data
- **State**: `user`, `isLoading`, `error`
- **Actions**: `fetchUser()`, `updateUser()`

## API Integration

### ApiService
- **Base URL**: Configured via `REACT_APP_API_URL` env var
- **Authentication**: JWT tokens via `Authorization: Bearer <token>` header
- **Interceptors**:
  - Request: Adds auth header automatically
  - Response: Handles 401 → refresh token → retry logic
- **Error Handling**: Standardized error messages

### Key Endpoints

```
POST   /auth/login             - User login
POST   /auth/signup            - User registration
POST   /auth/logout            - User logout
POST   /auth/refresh           - Token refresh
GET    /productos              - Fetch products
GET    /productos/:id          - Get product detail
POST   /pedidos                - Create order
GET    /pedidos                - Get user orders
GET    /pedidos/:id            - Get order detail
GET    /users/:id              - Get user profile
PUT    /users/:id              - Update user profile
```

## Authentication Flow

1. **Splash/Loading**: App loads stored auth from AsyncStorage
2. **Decision**: 
   - If token exists → navigate to Main (authenticated)
   - Otherwise → navigate to Auth (login/signup)
3. **Login/SignUp**: 
   - Validate credentials
   - Call API
   - Store tokens + user data
   - Set auth header for subsequent requests
4. **Token Refresh**: 
   - On 401 response
   - Call `/auth/refresh` with refresh token
   - Update tokens
   - Retry original request
5. **Logout**: 
   - Clear tokens from AsyncStorage
   - Clear auth state
   - Reset to Auth navigator

## Navigation Structure

```
RootNavigator
├── Auth (when unauthenticated)
│   ├── Login
│   └── SignUp
└── Main (when authenticated)
    ├── HomeStack
    │   ├── HomeScreen (product list)
    │   ├── ProductDetail
    │   └── Search
    ├── CartStack
    │   ├── CartScreen
    │   ├── Checkout
    │   └── OrderConfirmation
    └── ProfileStack
        ├── ProfileScreen
        ├── OrderHistory
        ├── OrderDetail
        └── Settings
```

## Multi-Tenant Support

All API requests include `empresaId` from authenticated user:

```typescript
// Example: Fetch products for user's company
GET /productos?empresaId=empresa-123
```

- User data includes `empresaId` from JWT token
- Cart/Order operations scoped to user's company
- API enforces tenant isolation server-side

## Testing

### Unit Tests (15+)

**AuthStore Tests** (`authStore.test.ts`)
- Login with valid credentials
- Store token in AsyncStorage
- Handle login errors
- Sign up with valid data
- Handle signup errors
- Clear auth on logout
- Remove tokens from storage
- Load stored authentication
- Handle missing stored auth
- Check isAuthenticated flag

**CartStore Tests** (`cartStore.test.ts`)
- Add new items
- Increase quantity for existing items
- Calculate total items
- Calculate total price
- Remove items
- Recalculate totals after removal
- Update item quantity
- Remove item when quantity ≤ 0
- Clear cart
- Get total items/price/specific item

**ApiService Tests** (`apiService.test.ts`)
- Make GET requests
- Add Authorization header
- Make POST requests
- Handle errors
- Set auth tokens
- Support multi-tenant queries

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test:watch

# With coverage
npm test:coverage

# Specific test file
npm test -- authStore.test.ts
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Code Quality

### ESLint
- Uses `@typescript-eslint/recommended`
- Enforces prettier formatting
- Configured in `.eslintrc.json`

### Prettier
- 100 char line width
- 2 space indents
- Single quotes
- Trailing commas

## Environment Variables

```
REACT_APP_API_URL           # Backend API base URL (default: http://localhost:3000/api)
REACT_APP_API_TIMEOUT       # Request timeout in ms (default: 30000)
REACT_APP_ENABLE_NOTIFICATIONS  # Feature flag
REACT_APP_ENABLE_ANALYTICS  # Feature flag
REACT_APP_SENTRY_DSN        # Error tracking
```

## Dependencies

### Core
- `react-native` 0.73+
- `@react-navigation/*` - Navigation
- `zustand` - State management
- `axios` - HTTP client

### Storage
- `@react-native-async-storage/async-storage` - Persistent storage

### Development
- `typescript` - Type safety
- `jest` - Testing
- `eslint` - Linting
- `prettier` - Code formatting

## Build & Deployment

### iOS
```bash
cd ios
xcodebuild -workspace OtraRondaMas.xcworkspace \
  -scheme OtraRondaMas \
  -configuration Release
```

### Android
```bash
cd android
./gradlew assembleRelease
```

## Security Considerations

- ✅ JWT tokens stored in AsyncStorage (encrypted by OS)
- ✅ Tokens auto-refreshed on expiry (401 response)
- ✅ Tokens cleared on logout
- ✅ No hardcoded secrets or API keys
- ✅ HTTPS enforced in production
- ✅ Multi-tenant scoping (empresaId)
- ✅ Server-side auth validation required

## Known Limitations

- Cart is session-based (clears on app restart)
- No offline support (requires network)
- Product images not implemented (placeholder emojis)
- Real-time notifications require socket.io integration (P7)

## Next Steps (P10-2, P10-3, etc.)

- **P10-2**: WebSocket real-time features
- **P10-3**: Advanced analytics & reporting
- **Offline Support**: SQLite + sync engine
- **Push Notifications**: Firebase Cloud Messaging
- **Image Upload**: S3 or image service integration
- **Biometric Auth**: Face ID / Fingerprint

## Contributing

1. Follow TypeScript strict mode
2. Write tests for new features
3. Run `npm run lint` before commit
4. Use conventional commit messages
5. Keep components under 300 lines

## License

UNLICENSED - Proprietary
