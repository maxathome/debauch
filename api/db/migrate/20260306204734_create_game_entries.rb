class CreateGameEntries < ActiveRecord::Migration[7.1]
  def change
    create_table :game_entries do |t|
      t.references :game, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.decimal :bet_usdc, precision: 18, scale: 6, null: false

      t.timestamps
    end

    add_index :game_entries, [:game_id, :user_id], unique: true
  end
end
