class CreateTransactions < ActiveRecord::Migration[7.1]
  def change
    create_table :transactions do |t|
      t.references :user, null: false, foreign_key: true
      t.decimal :amount_usdc, precision: 18, scale: 6, null: false
      t.string :tx_type
      t.string :status
      t.string :tx_hash

      t.timestamps
    end
  end
end
