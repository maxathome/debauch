# Debauch

A gambling bot for friend groups to bet tiny amounts of crypto with each other. Bet real USDC on Base network — win, lose, and watch the house balance drain.

Users deposit USDC into a shared bot wallet on Base (an Ethereum L2 with ~$0.001 gas fees). Balances are tracked internally so games are instant and free — no on-chain transaction per flip. Users can withdraw back to their own wallet at any time.

## Stack

| Part | Tech |
|------|------|
| Discord bot | Discord.js (Node.js) |
| Slack app | Express.js (Node.js) |
| API | Ruby on Rails 7.1 |
| Database | PostgreSQL |
| Crypto | USDC on Base network |

## Project structure

```
debauch/
├── api/          # Rails REST API — users, wallets, games, bets, house balance
├── bot/          # Discord bot — slash commands
├── slack/        # Slack app — slash commands + interactive components
└── contracts/    # Solidity smart contract (BetEscrow) + Hardhat deploy scripts
```

## Games

### Coinflip
Pick heads or tails and bet between $0.01 and $10.00 USDC. Win and you get 2x your bet back, lose and the house takes it. No house edge. Uses `SecureRandom` (OS-level CSPRNG).

If the house balance hits $0.00, games close until it's topped up.

### PVP Bets
Challenge another user to a bet on anything, with a third-party arbitrator to call the winner. Stakes are held in a Solidity escrow contract (`BetEscrow`) on Base until the arbitrator resolves. Bets expire automatically if the opponent doesn't accept within 12 hours.

- Player 1 creates a bet (description, win conditions, amount, opponent, arbitrator, resolve date)
- Player 2 receives a DM and accepts or declines
- On acceptance, both stakes are locked in the smart contract
- After the resolve date, the arbitrator picks a winner via `/bet resolve` — the pot is credited to the winner's internal balance
- Either party can cancel at any time (before resolution), which refunds both stakes

---

## Running locally

### Prerequisites
- Ruby 3.0.2
- Node.js 18+
- Docker (for Postgres)

### 1. API (required for both bots)

```bash
cd api
bundle install
docker compose up -d
bin/rails db:create db:migrate
bin/rails server -p 3001
```

**`api/.env`**
```
DATABASE_URL=postgresql://localhost/debauch_development
BOT_WALLET_ADDRESS=0x...
BOT_WALLET_PRIVATE_KEY=
BASE_RPC_URL=https://mainnet.base.org
USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

---

### 2. Discord bot

#### Setup
1. Go to [discord.com/developers](https://discord.com/developers/applications) and create an application
2. Under **Bot**, create a bot and copy the token
3. Under **OAuth2**, generate an invite URL with the `bot` and `applications.commands` scopes, then invite it to your server
4. Copy the **Application ID** (Client ID) and your **Guild ID** (right-click your server → Copy Server ID)

#### Run
```bash
cd bot
npm install
cp .env.example .env          # fill in credentials
node src/deploy-commands.js   # register slash commands (run once)
node src/index.js
```

**`bot/.env`**
```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
API_BASE_URL=http://localhost:3001/api
BOT_WALLET_ADDRESS=0x...
BOT_WALLET_PRIVATE_KEY=
BASE_RPC_URL=https://mainnet.base.org
```

#### Commands
| Command | Description |
|---------|-------------|
| `/balance` | Check your USDC balance (private) |
| `/deposit` | Get deposit address and instructions |
| `/withdraw <amount> <address>` | Withdraw USDC to your wallet |
| `/coinflip <heads\|tails> <amount>` | Flip a coin |
| `/house` | Check the house balance |
| `/donate <amount>` | Donate USDC to the house |

---

### 3. Slack app

#### Setup
1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app **From a manifest**
2. Paste the contents of `slack/manifest.yml` — update the request URLs to your public server address (see Tunnel below)
3. Install the app to your workspace
4. Under **OAuth & Permissions**, copy the **Bot User OAuth Token** (`xoxb-...`)
5. Under **Basic Information**, copy the **Signing Secret**
6. Invite the bot to your channel: `/invite @Debauch`

#### Tunnel (local development)
Slack requires a public HTTPS URL to deliver events. Use [ngrok](https://ngrok.com):
```bash
ngrok http 3002
```
Update the three request URLs in `slack/manifest.yml` with your ngrok URL, then reinstall the app in Slack after any URL change.

#### Run
```bash
cd slack
npm install
cp .env.example .env   # fill in credentials
node src/index.js
```

**`slack/.env`**
```
API_BASE_URL=http://localhost:3001/api
BOT_WALLET_ADDRESS=0x...
BOT_WALLET_PRIVATE_KEY=0x...
SLACK_SIGNING_SECRET=
SLACK_BOT_TOKEN=xoxb-...
ALLOWED_CHANNEL_ID=    # restrict commands to this channel (right-click channel → Copy Channel ID)
BASE_RPC_URL=https://mainnet.base.org
BET_ESCROW_ADDRESS=0x...
USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
PORT=3002
```

#### Commands
| Command | Description |
|---------|-------------|
| `/balance` | Check your USDC balance (private) |
| `/deposit` | Open deposit form — shows bot address and registers your sending wallet |
| `/withdraw` | Open withdrawal form — prefills your registered address |
| `/coinflip` | Flip a coin — pick amount and side from interactive buttons |
| `/house` | Check the house balance |
| `/donate <amount>` | Donate USDC to the house |
| `/bet` | Challenge another user to a PVP bet with on-chain escrow |
| `/checkbets` | View unresolved bets — filter by yours, all, or others'; post individual bets to channel |

#### Smart contract (BetEscrow)
The bot uses a Solidity escrow contract to hold USDC stakes on-chain during active bets.

```bash
cd contracts
npm install
cp .env.example .env   # add PRIVATE_KEY and BASE_RPC_URL
npx hardhat run scripts/deploy.js --network base-sepolia
```

Copy the printed `BET_ESCROW_ADDRESS` into `slack/.env`. The contract only needs to be deployed once.

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:id/wallet` | Get wallet + transaction history |
| `POST` | `/api/users/:id/wallet/deposit` | Credit a deposit |
| `POST` | `/api/users/:id/wallet/withdraw` | Submit a withdrawal |
| `POST` | `/api/games/coinflip` | Play coinflip |
| `POST` | `/api/games/roulette` | Play roulette |
| `GET` | `/api/house` | Get house balance |
| `POST` | `/api/house/fund` | Add funds to the house |
| `GET` | `/api/bets` | List unresolved bets (filter: `mine`/`all`/`others`, `user_id`) |
| `POST` | `/api/bets` | Create a bet |
| `GET` | `/api/bets/:id` | Get a single bet |
| `PATCH` | `/api/bets/:id/accept` | Accept a bet (p2) |
| `PATCH` | `/api/bets/:id/decline` | Decline a bet (p2) |
| `PATCH` | `/api/bets/:id/resolve` | Resolve a bet (arbitrator) |
| `PATCH` | `/api/bets/:id/cancel` | Cancel a bet |
| `POST` | `/api/admin/transfer_from_house` | Credit a user from the house balance |
