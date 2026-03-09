class Transaction < ApplicationRecord
  belongs_to :user

  TYPES = %w[deposit withdrawal game_win game_loss game_tie donation admin_transfer bet_escrow bet_win bet_refund].freeze

  validates :tx_type, inclusion: { in: TYPES }
  validates :amount_usdc, numericality: { greater_than: 0 }
  validates :status, presence: true
end
