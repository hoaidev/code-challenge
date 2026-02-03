# Live Scoreboard Module Specification

## Overview

This module provides a real-time scoreboard system that displays the top 10 users' scores with live updates. It includes secure score updating mechanisms to prevent unauthorized score manipulation.

## Architecture

### Components

1. **REST API** - Handles score update requests
2. **WebSocket Server** - Provides real-time scoreboard updates to connected clients
3. **Score Service** - Business logic for score management
4. **Authentication Middleware** - Validates user identity and action authorization
5. **Rate Limiter** - Prevents abuse and excessive requests

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT SIDE                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐            │
│   │    User      │         │   Website    │         │  WebSocket   │            │
│   │  completes   │────────▶│   Frontend   │◀───────▶│   Client     │            │
│   │   action     │         │              │         │              │            │
│   └──────────────┘         └──────┬───────┘         └──────▲───────┘            │
│                                   │                        │                     │
└───────────────────────────────────┼────────────────────────┼─────────────────────┘
                                    │                        │
                          POST /api/score/update      WebSocket Connection
                          (with auth token +          (Real-time updates)
                           action proof)
                                    │                        │
┌───────────────────────────────────┼────────────────────────┼─────────────────────┐
│                              SERVER SIDE                   │                     │
├───────────────────────────────────┼────────────────────────┼─────────────────────┤
│                                   ▼                        │                     │
│   ┌───────────────────────────────────────────────────────────────────────┐     │
│   │                         API Gateway / Load Balancer                    │     │
│   └───────────────────────────────┬───────────────────────────────────────┘     │
│                                   │                                              │
│   ┌───────────────────────────────▼───────────────────────────────────────┐     │
│   │                          Rate Limiter                                  │     │
│   │                    (Prevent abuse & DDoS)                              │     │
│   └───────────────────────────────┬───────────────────────────────────────┘     │
│                                   │                                              │
│   ┌───────────────────────────────▼───────────────────────────────────────┐     │
│   │                    Authentication Middleware                           │     │
│   │              (JWT validation + Action verification)                    │     │
│   └───────────────────────────────┬───────────────────────────────────────┘     │
│                                   │                                              │
│   ┌───────────────────────────────▼───────────────────────────────────────┐     │
│   │                          Score Service                                 │     │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │     │
│   │  │ Validate Action │  │  Update Score   │  │  Get Leaderboard│        │     │
│   │  │     Proof       │  │                 │  │                 │        │     │
│   │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        │     │
│   │           │                    │                    │                  │     │
│   └───────────┼────────────────────┼────────────────────┼──────────────────┘     │
│               │                    │                    │                        │
│   ┌───────────▼────────────────────▼────────────────────▼──────────────────┐     │
│   │                           Database Layer                                │     │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │     │
│   │  │   Redis Cache   │  │   PostgreSQL    │  │  Action Log DB  │         │     │
│   │  │  (Leaderboard)  │  │ (User Scores)   │  │ (Audit Trail)   │         │     │
│   │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │     │
│   └─────────────────────────────────────────────────────────────────────────┘     │
│                                   │                                              │
│   ┌───────────────────────────────▼───────────────────────────────────────┐     │
│   │                       WebSocket Server                                 │─────┘
│   │              (Broadcast leaderboard updates)                           │
│   └───────────────────────────────────────────────────────────────────────┘
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Score Update Flow

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐     ┌───────────┐
│  User   │     │ Client  │     │   API    │     │  Auth   │     │  Score   │     │ WebSocket │
│         │     │         │     │  Server  │     │Middleware│    │ Service  │     │  Server   │
└────┬────┘     └────┬────┘     └────┬─────┘     └────┬────┘     └────┬─────┘     └─────┬─────┘
     │               │               │                │               │                 │
     │ Complete      │               │                │               │                 │
     │ Action        │               │                │               │                 │
     │───────────────▶               │                │               │                 │
     │               │               │                │               │                 │
     │               │ POST /api/score/update         │               │                 │
     │               │ {token, action_id, proof}      │               │                 │
     │               │───────────────▶                │               │                 │
     │               │               │                │               │                 │
     │               │               │ Validate JWT   │               │                 │
     │               │               │───────────────▶│               │                 │
     │               │               │                │               │                 │
     │               │               │ Validate proof │               │                 │
     │               │               │───────────────▶│               │                 │
     │               │               │                │               │                 │
     │               │               │                │ Update score  │                 │
     │               │               │                │───────────────▶                 │
     │               │               │                │               │                 │
     │               │               │                │               │ Broadcast       │
     │               │               │                │               │ leaderboard     │
     │               │               │                │               │─────────────────▶
     │               │               │                │               │                 │
     │               │ 200 OK        │                │               │                 │
     │               │◀──────────────│                │               │                 │
     │               │               │                │               │                 │
     │               │ WS: Leaderboard update         │               │                 │
     │               │◀────────────────────────────────────────────────────────────────│
     │               │               │                │               │                 │
```

## API Specification

### Authentication

All score-modifying endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Endpoints

#### 1. Update Score

**POST** `/api/score/update`

Updates a user's score after completing an action.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "action_id": "string (UUID)",
  "action_proof": "string (signed hash)",
  "timestamp": "number (Unix timestamp)",
  "nonce": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "new_score": 1500,
  "rank": 5
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - Invalid action proof or action already claimed
- `429 Too Many Requests` - Rate limit exceeded

---

#### 2. Get Leaderboard

**GET** `/api/score/leaderboard`

Returns the top 10 users' scores.

**Response (200 OK):**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": "user_123",
      "username": "player1",
      "score": 5000
    },
    {
      "rank": 2,
      "user_id": "user_456",
      "username": "player2",
      "score": 4500
    }
  ],
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

#### 3. Get User Score

**GET** `/api/score/user/:userId`

Returns a specific user's score and rank.

**Response (200 OK):**
```json
{
  "user_id": "user_123",
  "username": "player1",
  "score": 1500,
  "rank": 42
}
```

---

### WebSocket API

#### Connection

```
wss://api.example.com/ws/leaderboard
```

**Authentication:** Pass JWT token as query parameter or in the first message after connection.

#### Events

**Server → Client: Leaderboard Update**
```json
{
  "event": "leaderboard_update",
  "data": {
    "leaderboard": [...],
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Server → Client: User Score Update**
```json
{
  "event": "score_update",
  "data": {
    "user_id": "user_123",
    "new_score": 1500,
    "rank_change": 2
  }
}
```

## Security Measures

### 1. Action Verification System

To prevent malicious score manipulation, implement a signed action proof system:

```
action_proof = HMAC_SHA256(
  secret_key,
  user_id + action_id + timestamp + nonce
)
```

- **action_id**: Unique identifier for the completed action (generated server-side when action starts)
- **timestamp**: Must be within acceptable time window (e.g., 5 minutes)
- **nonce**: One-time use random string to prevent replay attacks

### 2. Server-Side Action Tracking

```
┌─────────────────────────────────────────────────────────────┐
│                    Action Lifecycle                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User starts action                                       │
│     └─▶ Server generates action_id, stores in pending_actions│
│                                                              │
│  2. User completes action                                    │
│     └─▶ Client sends action_id + proof to server            │
│                                                              │
│  3. Server validates:                                        │
│     ├─▶ action_id exists in pending_actions                 │
│     ├─▶ action_id belongs to requesting user                │
│     ├─▶ action_proof signature is valid                     │
│     ├─▶ action has not been claimed before                  │
│     └─▶ timestamp is within acceptable window               │
│                                                              │
│  4. If valid:                                                │
│     ├─▶ Update user score                                   │
│     ├─▶ Mark action as claimed                              │
│     └─▶ Log to audit trail                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/score/update | 10 requests | per minute |
| GET /api/score/leaderboard | 60 requests | per minute |
| WebSocket connections | 1 connection | per user |

### 4. Additional Security Measures

- **JWT Expiration**: Short-lived tokens (15 minutes) with refresh token rotation
- **IP-based Rate Limiting**: Additional rate limiting per IP address
- **Anomaly Detection**: Flag accounts with suspicious scoring patterns
- **Audit Logging**: Log all score changes with full request context

## Data Models

### User Score

```sql
CREATE TABLE user_scores (
    user_id UUID PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    score BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_score_desc ON user_scores(score DESC);
```

### Action Log

```sql
CREATE TABLE action_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    action_id UUID NOT NULL UNIQUE,
    score_delta INT NOT NULL,
    previous_score BIGINT NOT NULL,
    new_score BIGINT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (user_id) REFERENCES user_scores(user_id)
);
```

### Pending Actions (Redis)

```
Key: pending_action:{action_id}
Value: {
    user_id: string,
    created_at: timestamp,
    expires_at: timestamp
}
TTL: 300 seconds (5 minutes)
```

## Caching Strategy

Use Redis Sorted Sets for efficient leaderboard operations:

```redis
# Add/update score
ZADD leaderboard {score} {user_id}

# Get top 10
ZREVRANGE leaderboard 0 9 WITHSCORES

# Get user rank (0-indexed)
ZREVRANK leaderboard {user_id}

# Get user score
ZSCORE leaderboard {user_id}
```

## Improvement Suggestions

### 1. Horizontal Scaling
- Use Redis Pub/Sub for distributing WebSocket messages across multiple server instances
- Implement consistent hashing for WebSocket connection distribution

### 2. Enhanced Anti-Cheat
- Implement behavioral analysis to detect automated/bot actions
- Add client-side integrity checks (e.g., device fingerprinting)
- Consider implementing a challenge-response system for suspicious activities

### 3. Performance Optimizations
- Batch leaderboard updates to reduce WebSocket broadcast frequency (e.g., every 500ms)
- Implement delta updates instead of full leaderboard pushes
- Use connection pooling for database connections

### 4. Monitoring & Observability
- Add metrics for score update latency, WebSocket connections, rate limit hits
- Implement distributed tracing for debugging
- Set up alerts for anomalous scoring patterns

### 5. Feature Enhancements
- Support multiple leaderboards (daily, weekly, all-time)
- Add pagination for extended leaderboard views
- Implement user score history and statistics

### 6. Resilience
- Implement circuit breakers for external dependencies
- Add graceful degradation (serve cached leaderboard if database is unavailable)
- Use message queues (e.g., RabbitMQ, Kafka) for score update processing to handle traffic spikes

## Technology Recommendations

| Component | Recommended Technology |
|-----------|----------------------|
| API Framework | Node.js (Express/Fastify) or Go |
| WebSocket | Socket.io or ws (Node.js) / Gorilla WebSocket (Go) |
| Cache | Redis |
| Database | PostgreSQL |
| Rate Limiting | Redis-based (e.g., express-rate-limit with redis store) |
| Authentication | JWT with RS256 signing |
| Message Queue | Redis Pub/Sub or RabbitMQ |

## Error Handling

All API errors should follow a consistent format:

```json
{
  "error": {
    "code": "INVALID_ACTION_PROOF",
    "message": "The action proof is invalid or has expired",
    "request_id": "req_abc123"
  }
}
```

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| INVALID_ACTION_PROOF | 403 | Action proof validation failed |
| ACTION_ALREADY_CLAIMED | 403 | Action has already been used |
| ACTION_EXPIRED | 403 | Action timestamp outside valid window |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server-side error |
