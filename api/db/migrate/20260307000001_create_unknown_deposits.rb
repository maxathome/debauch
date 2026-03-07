class CreateUnknownDeposits < ActiveRecord::Migration[7.1]
  def change
    create_table :unknown_deposits do |t|
      t.string :sender_address, null: false
      t.decimal :amount_usdc, precision: 18, scale: 6, null: false
      t.string :tx_hash, null: false
      t.integer :block_number, null: false
      t.string :status, null: false, default: "pending"
      t.string :resolved_to
      t.references :resolved_user, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :unknown_deposits, :tx_hash, unique: true
    add_index :unknown_deposits, :status
  end
end
