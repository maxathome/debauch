class Game < ApplicationRecord
  has_many :game_entries
  has_many :users, through: :game_entries
  belongs_to :winner, class_name: "User", optional: true

  enum :status, { open: "open", closed: "closed", resolved: "resolved" }
  enum :game_type, { coinflip: "coinflip", jackpot: "jackpot" }

  validates :game_type, :status, presence: true
  validates :pot_usdc, numericality: { greater_than_or_equal_to: 0 }
end
