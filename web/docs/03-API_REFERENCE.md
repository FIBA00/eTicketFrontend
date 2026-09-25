# API Reference

Base URL: `http://localhost:3000/api/v1`

## Auth

### POST /auth/login
Request:
```json
{ "username": "admin", "password": "admin123" }
```
Response 200:
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "username": "admin",
    "fullName": "System Administrator",
    "role": "SYSTEM_ADMIN",
    "stationId": null
  }
}
```
Response 401:
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid credentials" } }
```

### POST /auth/refresh
Request:
```json
{ "refreshToken": "eyJhbG..." }
```
Response 200:
```json
{ "accessToken": "eyJhbG...", "refreshToken": "eyJhbG...", "expiresIn": 900 }
```

### POST /auth/logout
Headers: `Authorization: Bearer <accessToken>`
Response 200:
```json
{ "message": "Logged out" }
```

## Users

### GET /users
Headers: `Authorization: Bearer <accessToken>`
Roles: SYSTEM_ADMIN, STATION_CONTROLLER
Response 200: Array of user objects

### GET /users/:id
Headers: `Authorization: Bearer <accessToken>`
Roles: SYSTEM_ADMIN, STATION_CONTROLLER

### POST /users
Headers: `Authorization: Bearer <accessToken>`
Role: SYSTEM_ADMIN
Request:
```json
{
  "username": "newuser",
  "password": "password123",
  "fullName": "Full Name",
  "phone": "+251...",
  "role": "TICKETER",
  "stationId": "uuid"
}
```

### PATCH /users/:id
Headers: `Authorization: Bearer <accessToken>`
Role: SYSTEM_ADMIN

### DELETE /users/:id
Headers: `Authorization: Bearer <accessToken>`
Role: SYSTEM_ADMIN (soft delete — sets isActive=false)

## Stations

### GET /stations
Headers: `Authorization: Bearer <accessToken>`
Response 200: Array of station objects

### GET /stations/:id
Headers: `Authorization: Bearer <accessToken>`

### POST /stations
Headers: `Authorization: Bearer <accessToken>`
Role: SYSTEM_ADMIN
Request:
```json
{
  "name": "Adama Terminal",
  "code": "ADA",
  "city": "Adama",
  "region": "Oromia",
  "latitude": 8.55,
  "longitude": 39.27
}
```

### PATCH /stations/:id
Headers: `Authorization: Bearer <accessToken>`
Role: SYSTEM_ADMIN

### DELETE /stations/:id
Headers: `Authorization: Bearer <accessToken>`
Role: SYSTEM_ADMIN (soft delete)

## Vehicles

### GET /vehicles?stationId=uuid
Headers: `Authorization: Bearer <accessToken>`
Query: optional stationId filter
Note: Non-admin users only see their own station's vehicles

### GET /vehicles/:id
Headers: `Authorization: Bearer <accessToken>`

### POST /vehicles
Headers: `Authorization: Bearer <accessToken>`
Roles: SYSTEM_ADMIN, AGENT
Request:
```json
{
  "plateNumber": "ET-12345",
  "type": "BUS",
  "capacity": 50,
  "agentId": "uuid",
  "stationId": "uuid"
}
```
Note: AGENT role auto-sets agentId to their own userId

### PATCH /vehicles/:id
Headers: `Authorization: Bearer <accessToken>`
Roles: SYSTEM_ADMIN, AGENT (own vehicles only)

### DELETE /vehicles/:id
Headers: `Authorization: Bearer <accessToken>`
Roles: SYSTEM_ADMIN, AGENT (own only, soft delete)

## Routes

### GET /routes?originStationId=&destinationStationId=
Headers: `Authorization: Bearer <accessToken>`

### GET /routes/:id
Headers: `Authorization: Bearer <accessToken>`

### POST /routes
Headers: `Authorization: Bearer <accessToken>`
Role: SYSTEM_ADMIN
Request:
```json
{
  "originStationId": "uuid",
  "destinationStationId": "uuid",
  "distanceKm": 90,
  "baseFareCents": 20000,
  "estimatedMinutes": 90
}
```

### PATCH /routes/:id
Headers: `Authorization: Bearer <accessToken>`
Role: SYSTEM_ADMIN

### DELETE /routes/:id
Headers: `Authorization: Bearer <accessToken>`
Role: SYSTEM_ADMIN (soft delete)

## Error format (all endpoints)
```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
    "message": "Human readable message",
    "details": { ... }
  }
}
```
