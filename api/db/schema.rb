# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2026_03_09_152954) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "bets", force: :cascade do |t|
    t.string "player1_id", null: false
    t.string "player2_id", null: false
    t.string "arbitrator_id", null: false
    t.string "player1_username"
    t.string "player2_username"
    t.string "arbitrator_username"
    t.text "description", null: false
    t.decimal "amount_usdc", precision: 18, scale: 6, null: false
    t.string "status", default: "pending_acceptance", null: false
    t.datetime "resolve_after", null: false
    t.string "channel_id"
    t.integer "contract_bet_id"
    t.string "winner_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "player1_wins_if"
    t.string "player2_wins_if"
    t.index ["arbitrator_id"], name: "index_bets_on_arbitrator_id"
    t.index ["player1_id"], name: "index_bets_on_player1_id"
    t.index ["player2_id"], name: "index_bets_on_player2_id"
    t.index ["status"], name: "index_bets_on_status"
  end

  create_table "game_entries", force: :cascade do |t|
    t.bigint "game_id", null: false
    t.bigint "user_id", null: false
    t.decimal "bet_usdc", precision: 18, scale: 6, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["game_id", "user_id"], name: "index_game_entries_on_game_id_and_user_id", unique: true
    t.index ["game_id"], name: "index_game_entries_on_game_id"
    t.index ["user_id"], name: "index_game_entries_on_user_id"
  end

  create_table "games", force: :cascade do |t|
    t.string "game_type", null: false
    t.string "status", default: "open", null: false
    t.decimal "pot_usdc", precision: 18, scale: 6, default: "0.0", null: false
    t.bigint "winner_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["status"], name: "index_games_on_status"
    t.index ["winner_id"], name: "index_games_on_winner_id"
  end

  create_table "house_balances", force: :cascade do |t|
    t.decimal "balance_usdc", precision: 18, scale: 6, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "transactions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.decimal "amount_usdc", precision: 18, scale: 6, null: false
    t.string "tx_type"
    t.string "status"
    t.string "tx_hash"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_transactions_on_user_id"
  end

  create_table "unknown_deposits", force: :cascade do |t|
    t.string "sender_address", null: false
    t.decimal "amount_usdc", precision: 18, scale: 6, null: false
    t.string "tx_hash", null: false
    t.integer "block_number", null: false
    t.string "status", default: "pending", null: false
    t.string "resolved_to"
    t.bigint "resolved_user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["resolved_user_id"], name: "index_unknown_deposits_on_resolved_user_id"
    t.index ["status"], name: "index_unknown_deposits_on_status"
    t.index ["tx_hash"], name: "index_unknown_deposits_on_tx_hash", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "platform_user_id"
    t.string "username"
    t.string "eth_address"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["platform_user_id"], name: "index_users_on_platform_user_id", unique: true
  end

  create_table "wallets", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.decimal "balance_usdc", precision: 18, scale: 6, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_wallets_on_user_id"
  end

  add_foreign_key "game_entries", "games"
  add_foreign_key "game_entries", "users"
  add_foreign_key "transactions", "users"
  add_foreign_key "unknown_deposits", "users", column: "resolved_user_id"
  add_foreign_key "wallets", "users"
end
