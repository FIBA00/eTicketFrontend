# Business Rules

## Fare calculation

| Component           | Rate                | Applied to |
| ------------------- | ------------------- | ---------- |
| Service Charge (SC) | 5% ≤50km / 4% >50km | Fare       |
| VAT                 | 15%                 | SC         |
| Station Fee         | 10%                 | SC         |
| Ticketer Commission | 5%                  | SC         |

## Worked examples

### Example A: 60 ETB, 45 km (≤50km → 5% SC)

- Fare: 60.00
- SC: 60 × 5% = 3.00
- VAT: 3 × 15% = 0.45
- Station Fee: 3 × 10% = 0.30
- **Total: 63.75**
- Commission: 3 × 5% = 0.15
- Platform net: 3 − 0.30 − 0.15 = 2.55

### Example B: 200 ETB, 90 km (>50km → 4% SC)

- Fare: 200.00
- SC: 200 × 4% = 8.00
- VAT: 8 × 15% = 1.20
- Station Fee: 8 × 10% = 0.80
- **Total: 210.00**
- Commission: 8 × 5% = 0.40
- Platform net: 8 − 0.80 − 0.40 = 6.80

## Roles and responsibilities

### System Admin

- Create/manage users, assign roles and stations
- Finance audit, revenue tracking
- System security, backups
- Troubleshooting

### Agent (Waldaa Konkolaachistootaa)

- Register vehicles under their account
- Obtain permits for vehicles
- Ensure station fees are paid

### Ticketer

- Issue tickets to passengers
- Perform daily cash audit
- Weekly commission withdrawal (5% of SC per ticket)
- No salary — commission only

### Station Controller

- Manage vehicle flow (arrivals/departures)
- Track vehicles
- Oversee ticketers and agents at station

### Station Info Board

- Digital display of incoming/outgoing vehicles
- Read-only

## Revenue model

- Platform revenue = SC − Station Fee − Commission
- Daily audit mandatory
- Weekly withdrawal cycle for ticketers
