class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.string :discord_id
      t.string :username
      t.string :eth_address

      t.timestamps
    end
    add_index :users, :discord_id, unique: true
  end
end
