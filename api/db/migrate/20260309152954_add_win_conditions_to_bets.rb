class AddWinConditionsToBets < ActiveRecord::Migration[7.1]
  def change
    add_column :bets, :player1_wins_if, :string
    add_column :bets, :player2_wins_if, :string
  end
end
