# Debauch

A Discord bot for friend groups to gamble tiny amounts of crypto with each other. Bet real USDC on Base network — win, lose, and watch the house balance drain.

## How it works

Users deposit USDC into a shared bot wallet on the Base network (an Ethereum L2 with ~$0.001 gas fees). Balances are tracked internally so games are instant and free — no on-chain transaction per flip. Users can withdraw their balance back to their own wallet at any time.

## Stack

| Part | Tech |
|------|------|
| Bot | Discord.js (Node.js) |
| API | Ruby on Rails 7.1 |
| Database | PostgreSQL |
| Crypto | USDC on Base network |

## Project structure

```
debauch/
├── api/    # Rails REST API — users, wallets, games, house balance
└── bot/    # Discord bot — slash commands
```

## Bot commands

| Command | Description |
|---------|-------------|
| `/balance` | Check your USDC balance (private) |
| `/deposit` | Get instructions to deposit USDC |
| `/withdraw <amount> <address>` | Withdraw USDC to your wallet |
| `/coinflip <heads\|tails> <amount>` | Flip a coin. Win 2x your bet, lose it all |
| `/house` | Check how much the house has — games close at $0.00 |

## Games

### Coinflip
Pick heads or tails and bet between $0.01 and $10.00 USDC. The coin is flipped using `SecureRandom` (OS-level CSPRNG). No house edge — win and you get 2x your bet back, lose and the house takes it. If the house balance hits $0.00, games are closed until it's topped up.

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:discord_id` | Get a user |
| `POST` | `/api/users` | Create/update a user |
| `GET` | `/api/users/:discord_id/wallet` | Get wallet + transaction history |
| `POST` | `/api/users/:discord_id/wallet/deposit` | Credit a deposit |
| `POST` | `/api/users/:discord_id/wallet/withdraw` | Submit a withdrawal |
| `POST` | `/api/games/coinflip` | Play coinflip |
| `GET` | `/api/house` | Get house balance |
| `POST` | `/api/house/fund` | Add funds to the house |

## Running locally

### Prerequisites
- Ruby 3.0.2
- Node.js 18+
- Docker (for Postgres)

### API
```bash
cd api
bundle install
docker compose up -d       # start Postgres
bin/rails db:create db:migrate
bin/rails server -p 3001
```

### Bot
```bash
cd bot
npm install
cp .env.example .env       # fill in your Discord credentials
node src/deploy-commands.js
node src/index.js
```

### Environment variables

**`api/.env`**
```
DATABASE_URL=postgresql://localhost/debauch_development
BOT_WALLET_ADDRESS=
BOT_WALLET_PRIVATE_KEY=
BASE_RPC_URL=https://mainnet.base.org
USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

**`bot/.env`**
```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
API_BASE_URL=http://localhost:3001/api
BOT_WALLET_ADDRESS=
BOT_WALLET_PRIVATE_KEY=
BASE_RPC_URL=https://mainnet.base.org
```
