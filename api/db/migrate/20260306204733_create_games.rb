class CreateGames < ActiveRecord::Migration[7.1]
  def change
    create_table :games do |t|
      t.string :game_type, null: false
      t.string :status, null: false, default: "open"
      t.decimal :pot_usdc, precision: 18, scale: 6, default: "0.0", null: false
      t.bigint :winner_id

      t.timestamps
    end

    add_index :games, :winner_id
    add_index :games, :status
  end
end
