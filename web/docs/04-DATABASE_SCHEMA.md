# Database Schema

## Enums

### role

- SYSTEM_ADMIN — full control
- AGENT — registers vehicles, gets permits
- TICKETER — issues tickets, daily audit
- STATION_CONTROLLER — manages station operations

### vehicle_type

- BUS, MINIBUS, COASTER

### ticket_status

- ISSUED, VOID, REFUNDED

### sync_operation

- CREATE, UPDATE, DELETE

### sync_status

- PENDING, APPLIED, CONFLICT, REJECTED

## Tables

### users

| Column        | Type               | Notes                      |
| ------------- | ------------------ | -------------------------- |
| id            | uuid PK            | default: gen_random_uuid() |
| username      | varchar(50) UNIQUE |                            |
| password_hash | varchar(255)       | bcrypt                     |
| full_name     | varchar(100)       |                            |
| phone         | varchar(20)        | nullable                   |
| role          | role enum          |                            |
| station_id    | uuid FK → stations | nullable                   |
| is_active     | boolean            | default: true              |
| created_at    | timestamp          | default: now()             |
| updated_at    | timestamp          | default: now()             |

### stations

| Column     | Type               | Notes                |
| ---------- | ------------------ | -------------------- |
| id         | uuid PK            |                      |
| name       | varchar(100)       |                      |
| code       | varchar(10) UNIQUE | e.g. "ADD", "ADA"    |
| city       | varchar(100)       |                      |
| region     | varchar(100)       |                      |
| latitude   | real               | nullable             |
| longitude  | real               | nullable             |
| is_active  | boolean            | default: true        |
| version    | integer            | default: 0, for sync |
| created_at | timestamp          |                      |
| updated_at | timestamp          |                      |

### vehicles

| Column       | Type               | Notes         |
| ------------ | ------------------ | ------------- |
| id           | uuid PK            |               |
| plate_number | varchar(20) UNIQUE |               |
| type         | vehicle_type enum  |               |
| capacity     | integer            |               |
| agent_id     | uuid FK → users    |               |
| station_id   | uuid FK → stations |               |
| is_active    | boolean            | default: true |
| created_at   | timestamp          |               |
| updated_at   | timestamp          |               |

### routes

| Column                 | Type               | Notes         |
| ---------------------- | ------------------ | ------------- |
| id                     | uuid PK            |               |
| origin_station_id      | uuid FK → stations |               |
| destination_station_id | uuid FK → stations |               |
| distance_km            | real               |               |
| base_fare_cents        | integer            |               |
| estimated_minutes      | integer            | nullable      |
| is_active              | boolean            | default: true |
| created_at             | timestamp          |               |
| updated_at             | timestamp          |               |

### tickets

| Column               | Type               | Notes                 |
| -------------------- | ------------------ | --------------------- |
| id                   | uuid PK            |                       |
| ticket_number        | varchar(20) UNIQUE | e.g. "ET-2026-000001" |
| route_id             | uuid FK → routes   |                       |
| vehicle_id           | uuid FK → vehicles |                       |
| passenger_name       | varchar(100)       |                       |
| passenger_phone      | varchar(20)        | nullable              |
| seat_number          | integer            |                       |
| departure_date       | timestamp          |                       |
| status               | ticket_status enum | default: ISSUED       |
| fare_cents           | integer            |                       |
| service_charge_cents | integer            |                       |
| station_fee_cents    | integer            |                       |
| vat_cents            | integer            |                       |
| total_cents          | integer            |                       |
| commission_cents     | integer            |                       |
| ticketer_id          | uuid FK → users    |                       |
| station_id           | uuid FK → stations |                       |
| client_mutation_id   | varchar(36) UNIQUE | for sync idempotency  |
| issued_at            | timestamp          | default: now()        |
| voided_at            | timestamp          | nullable              |
| void_reason          | varchar(500)       | nullable              |
| version              | integer            | default: 0            |

**Unique constraints:**

- (vehicle_id, departure_date, seat_number) — no double-booking
- (client_mutation_id) — sync idempotency

### daily_audits

| Column                     | Type               | Notes |
| -------------------------- | ------------------ | ----- |
| id                         | uuid PK            |       |
| station_id                 | uuid FK → stations |       |
| date                       | date               |       |
| total_tickets              | integer            |       |
| total_fare_cents           | integer            |       |
| total_service_charge_cents | integer            |       |
| total_station_fee_cents    | integer            |       |
| total_vat_cents            | integer            |       |
| total_revenue_cents        | integer            |       |
| total_commission_cents     | integer            |       |
| net_revenue_cents          | integer            |       |
| audited_by_id              | uuid               |       |
| created_at                 | timestamp          |       |

**Unique:** (station_id, date)

### withdrawals

| Column          | Type            | Notes                   |
| --------------- | --------------- | ----------------------- |
| id              | uuid PK         |                         |
| user_id         | uuid FK → users |                         |
| amount_cents    | integer         |                         |
| week_start_date | date            |                         |
| status          | varchar(20)     | PENDING, APPROVED, PAID |
| requested_at    | timestamp       |                         |
| processed_at    | timestamp       | nullable                |
| processed_by_id | uuid            | nullable                |

### refresh_tokens

| Column     | Type                | Notes         |
| ---------- | ------------------- | ------------- |
| id         | uuid PK             |               |
| user_id    | uuid FK → users     |               |
| token_hash | varchar(255) UNIQUE | bcrypt hashed |
| expires_at | timestamp           |               |
| revoked_at | timestamp           | nullable      |
| created_at | timestamp           |               |

### sync_log

| Column             | Type                | Notes    |
| ------------------ | ------------------- | -------- |
| id                 | uuid PK             |          |
| station_id         | uuid FK → stations  |          |
| device_id          | varchar(100)        |          |
| table              | varchar(50)         |          |
| operation          | sync_operation enum |          |
| payload            | jsonb               |          |
| status             | sync_status enum    |          |
| conflict_reason    | varchar(500)        | nullable |
| client_mutation_id | varchar(36)         |          |
| applied_at         | timestamp           |          |

**Unique:** (station_id, client_mutation_id)
