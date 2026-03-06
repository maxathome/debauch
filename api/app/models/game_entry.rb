class GameEntry < ApplicationRecord
  belongs_to :game
  belongs_to :user

  validates :bet_usdc, numericality: { greater_than: 0 }
  validates :user_id, uniqueness: { scope: :game_id, message: "already entered this game" }
end
