class CreateHouseBalance < ActiveRecord::Migration[7.1]
  def change
    create_table :house_balances do |t|
      t.decimal :balance_usdc, precision: 18, scale: 6, null: false, default: "0.0"
      t.timestamps
    end
  end
end
