# Properties & Demo Contacts API (H3)

## Overview

The Properties API provides endpoints for:
- **Property Listing**: Browse properties with filtering, search, and pagination
- **Property Details**: Get detailed information about a specific property
- **Demo Contact Form**: Submit property inquiries via contact form
- **Email Verification**: Verify contact email addresses

## Base URL
```
GET /properties
POST /properties/demo/contact
GET /properties/demo/verify
```

## Endpoints

### 1. GET /properties - List Properties

**Description**: Get a paginated list of properties with filtering and search

**Parameters**:
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| search | string | No | Search by title or description | `Modern` |
| location | string | No | Filter by location (case-insensitive) | `Buenos Aires` |
| minPrice | number | No | Minimum price filter | `200000` |
| maxPrice | number | No | Maximum price filter | `500000` |
| type | string | No | Property type: `apartment`, `house`, `land`, `commercial` | `apartment` |
| bedrooms | integer | No | Filter by number of bedrooms | `2` |
| limit | integer | No | Results per page (default: 10, max: 100) | `10` |
| offset | integer | No | Pagination offset (default: 0) | `20` |

**Response** (200 OK):
```json
{
  "properties": [
    {
      "id": "prop-1",
      "title": "Modern Apartment",
      "description": "Beautiful apartment...",
      "type": "apartment",
      "price": 250000,
      "bedrooms": 2,
      "bathrooms": 1,
      "location": "Buenos Aires",
      "address": "Av. Corrientes 1234",
      "latitude": -34.6037,
      "longitude": -58.3816,
      "images": ["url1", "url2"],
      "amenities": ["pool", "gym"],
      "createdAt": "2026-10-29T12:00:00Z",
      "updatedAt": "2026-10-29T12:00:00Z"
    }
  ],
  "total_count": 42,
  "has_more": true
}
```

**Error Responses**:
- **400 Bad Request**: Invalid filter parameters (invalid number format, invalid range)
- **500 Internal Server Error**: Database error

**Examples**:
```bash
# Get all properties
curl https://api.wapsell.com/properties

# Search for apartments in Buenos Aires
curl "https://api.wapsell.com/properties?search=Modern&location=Buenos%20Aires&type=apartment"

# Filter by price range and bedrooms
curl "https://api.wapsell.com/properties?minPrice=200000&maxPrice=500000&bedrooms=2"

# Pagination
curl "https://api.wapsell.com/properties?limit=10&offset=20"
```

---

### 2. GET /properties/{id} - Get Property Details

**Description**: Get detailed information about a specific property

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Property ID |

**Response** (200 OK):
```json
{
  "id": "prop-1",
  "title": "Modern Apartment in San Telmo",
  "description": "Beautifully renovated 2-bedroom apartment...",
  "type": "apartment",
  "price": 250000,
  "bedrooms": 2,
  "bathrooms": 1,
  "location": "San Telmo, Buenos Aires",
  "address": "Avenida Defensa 1456, Buenos Aires, Argentina",
  "latitude": -34.6315,
  "longitude": -58.3665,
  "images": [
    "https://images.unsplash.com/photo-1493857671505-72967e2e2760",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"
  ],
  "amenities": ["WiFi", "Air Conditioning", "Heating", "Balcony"],
  "metadata": {
    "yearBuilt": 1980,
    "renovated": 2024,
    "squareMeters": 85
  },
  "createdAt": "2026-10-29T12:00:00Z",
  "updatedAt": "2026-10-29T12:00:00Z"
}
```

**Error Responses**:
- **404 Not Found**: Property doesn't exist or has been soft-deleted

**Examples**:
```bash
curl https://api.wapsell.com/properties/prop-buenos-aires-apt-001
```

---

### 3. POST /properties/demo/contact - Submit Contact Form

**Description**: Submit a property inquiry with email verification

**Rate Limiting**: 5 requests per hour per IP address

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+54 9 11 2345-6789",
  "message": "I'm interested in viewing this property",
  "propertyId": "prop-1"  // optional
}
```

**Field Validation**:
- `name`: Required, non-empty string
- `email`: Required, valid email format
- `phone`: Required, valid phone format (7+ digits)
- `message`: Required, non-empty string
- `propertyId`: Optional, must exist if provided

**Response** (200 OK):
```json
{
  "message": "Contact saved",
  "lead_id": "lead-uuid-here"
}
```

**Error Responses**:
- **400 Bad Request**: Validation error (invalid email, phone, missing required fields)
  ```json
  {
    "statusCode": 400,
    "message": "Invalid email format",
    "error": "Bad Request"
  }
  ```
- **422 Unprocessable Entity**: Email send failed
  ```json
  {
    "statusCode": 422,
    "message": "Failed to send verification email: ...",
    "error": "Unprocessable Entity"
  }
  ```
- **429 Too Many Requests**: Rate limit exceeded
  ```json
  {
    "statusCode": 429,
    "message": "Too many requests. Rate limit: 5 per hour per IP"
  }
  ```
- **500 Internal Server Error**: Database error

**What Happens Next**:
1. Lead is saved to database
2. Verification email is sent to provided address
3. Email contains a verification link (24-hour TTL)
4. Contact can verify email via `/properties/demo/verify` endpoint

**Examples**:
```bash
curl -X POST https://api.wapsell.com/properties/demo/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+54 9 11 2345-6789",
    "message": "Interested in viewing",
    "propertyId": "prop-1"
  }'
```

---

### 4. GET /properties/demo/verify - Verify Email Address

**Description**: Verify contact email address with JWT token

**Idempotency**: Multiple calls with the same token return the same response (idempotent)

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | Yes | Email verification token (from email link) |

**Response** (200 OK):
```json
{
  "message": "Email verified successfully",
  "verified": true
}
```

**Idempotent Response** (when already verified):
```json
{
  "message": "Email already verified",
  "verified": true
}
```

**Error Responses**:
- **400 Bad Request**: Invalid or malformed token
  ```json
  {
    "statusCode": 400,
    "message": "Invalid or expired token",
    "error": "Bad Request"
  }
  ```
- **410 Gone**: Token has expired (24-hour TTL)
  ```json
  {
    "statusCode": 410,
    "message": "Verification token has expired",
    "error": "Gone"
  }
  ```

**Token Format**:
- JWT token sent in verification email
- 24-hour expiration time
- Contains email address as subject

**Examples**:
```bash
# Verify email (token from email link)
curl "https://api.wapsell.com/properties/demo/verify?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Second verification with same token (idempotent)
curl "https://api.wapsell.com/properties/demo/verify?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# Returns same success response
```

---

### 5. GET /properties/demo/token - Get Verification Token (Testing Only)

**Description**: Get a verification token for testing (should be removed in production)

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | Email to generate token for |

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note**: This endpoint is for testing only and should be protected or removed in production.

---

## Database Schema

### Property Table
```sql
CREATE TABLE "Property" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- 'apartment', 'house', 'land', 'commercial'
  price DECIMAL(12,2) NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  images JSONB, -- Array of image URLs
  amenities JSONB, -- Array of amenities
  metadata JSONB, -- Additional metadata
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP -- Soft delete
);
```

### Lead Table
```sql
CREATE TABLE "Lead" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  propertyId TEXT, -- FK to Property (optional)
  verifiedAt TIMESTAMP, -- When email was verified
  verificationToken TEXT UNIQUE, -- Hash of JWT token
  tokenExpiresAt TIMESTAMP, -- Token expiration (24h)
  ipAddress TEXT, -- For rate limiting
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP
);
```

### EmailVerificationToken Table
```sql
CREATE TABLE "EmailVerificationToken" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  tokenHash TEXT UNIQUE NOT NULL, -- SHA256 hash
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT now()
);
```

---

## Filtering & Search Examples

### Example 1: Search Modern Apartments in Buenos Aires
```bash
curl "https://api.wapsell.com/properties?search=Modern&location=Buenos%20Aires&type=apartment"
```

### Example 2: Find Houses Between 400k-600k
```bash
curl "https://api.wapsell.com/properties?minPrice=400000&maxPrice=600000&type=house"
```

### Example 3: List 4-Bedroom Properties with Pagination
```bash
curl "https://api.wapsell.com/properties?bedrooms=4&limit=20&offset=0"
```

### Example 4: Full-Text Search
```bash
curl "https://api.wapsell.com/properties?search=garden%20garage"
```

---

## Rate Limiting

**Endpoint**: `POST /properties/demo/contact`
- **Limit**: 5 requests per hour per IP address
- **Window**: 1 hour sliding window
- **Headers**: No special rate limit headers required
- **Response**: 429 Too Many Requests when limit exceeded

---

## Email Verification Flow

```
1. User submits contact form → POST /properties/demo/contact
   ↓
2. Lead saved to database
   ↓
3. Verification email sent with JWT token (24h TTL)
   ↓
4. User clicks verification link in email
   ↓
5. Frontend sends token to → GET /properties/demo/verify?token=...
   ↓
6. Lead.verifiedAt is set
   ↓
7. Lead can now be contacted / qualified
```

---

## Environment Variables

```bash
# Email Configuration
RESEND_API_KEY=xxx_xxxxx_xxxx  # Resend API key
RESEND_FROM_EMAIL=noreply@wapsell.com  # From email address
FRONTEND_URL=http://localhost:3000  # Frontend URL for verification links

# JWT Configuration
JWT_SECRET=your-secret-key  # JWT signing secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wapsell
```

---

## Demo Data Seeding

Load demo properties:
```bash
cd apps/api
npm run seed -- --seed=properties.seed.ts
```

This creates 6 sample properties across different types and locations.

---

## Testing

### Run Unit Tests
```bash
npm run test -- properties.service.spec.ts
npm run test -- demo.service.spec.ts
```

### Run E2E Tests
```bash
npm run test:e2e -- properties.e2e.spec.ts
```

### Run All Tests
```bash
npm run test
```

---

## Security Considerations

1. **Email Validation**: Checks valid email format before saving
2. **Phone Validation**: Ensures minimum 7 digits
3. **Rate Limiting**: 5 requests per hour per IP to prevent abuse
4. **Token Expiration**: Verification tokens expire after 24 hours
5. **Soft Deletion**: Properties can be soft-deleted (deletedAt timestamp)
6. **Property Verification**: Confirms property exists before creating lead
7. **JWT Verification**: Token must be valid and unexpired

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Demo properties seeded
- [ ] Resend API key configured
- [ ] Rate limiting tested
- [ ] Email verification flow tested
- [ ] All tests passing
- [ ] Swagger documentation generated
- [ ] CORS configured if needed
- [ ] Remove `/properties/demo/token` endpoint in production

---

## Troubleshooting

### Email Not Sending
- Check RESEND_API_KEY is set
- Verify RESEND_FROM_EMAIL is valid
- Check Resend API status

### Rate Limit Not Working
- Ensure X-Forwarded-For header is passed from proxy
- Check IP detection logic in controller

### Token Validation Failing
- Verify JWT_SECRET matches across services
- Check token hasn't expired (24h TTL)
- Confirm token format is valid

---

## Future Enhancements

1. **Geospatial Queries**: Use PostGIS for radius-based search
2. **Full-Text Search**: Elasticsearch integration for better search
3. **Favorites**: User wishlist/favorites feature
4. **Notifications**: Real-time alerts for new matching properties
5. **SMS Verification**: Alternative to email verification
6. **Multilingual**: Support multiple languages in descriptions
7. **Image Upload**: Direct image upload instead of URLs
8. **Admin Panel**: Manage properties, leads, and contact inquiries
