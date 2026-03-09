class CreateBets < ActiveRecord::Migration[7.1]
  def change
    create_table :bets do |t|
      t.string  :player1_id,       null: false  # Slack user ID
      t.string  :player2_id,       null: false
      t.string  :arbitrator_id,    null: false
      t.string  :player1_username
      t.string  :player2_username
      t.string  :arbitrator_username
      t.text    :description,      null: false
      t.decimal :amount_usdc,      precision: 18, scale: 6, null: false
      t.string  :status,           null: false, default: "pending_acceptance"
      t.datetime :resolve_after,   null: false
      t.string  :channel_id        # channel where the result is announced
      t.integer :contract_bet_id   # on-chain ID in BetEscrow contract
      t.string  :winner_id         # set when resolved

      t.timestamps
    end

    add_index :bets, :player1_id
    add_index :bets, :player2_id
    add_index :bets, :arbitrator_id
    add_index :bets, :status
  end
end
