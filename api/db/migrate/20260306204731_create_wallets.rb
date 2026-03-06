class CreateWallets < ActiveRecord::Migration[7.1]
  def change
    create_table :wallets do |t|
      t.references :user, null: false, foreign_key: true
      t.decimal :balance_usdc, precision: 18, scale: 6, default: "0.0", null: false

      t.timestamps
    end
  end
end
