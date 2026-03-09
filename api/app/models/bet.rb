class Bet < ApplicationRecord
  STATUSES = %w[pending_acceptance active resolved cancelled expired].freeze

  validates :player1_id,    presence: true
  validates :player2_id,    presence: true
  validates :arbitrator_id, presence: true
  validates :description,   presence: true
  validates :amount_usdc,   numericality: { greater_than: 0 }
  validates :status,        inclusion: { in: STATUSES }
  validates :resolve_after, presence: true

  scope :pending,  -> { where(status: "pending_acceptance") }
  scope :active,   -> { where(status: "active") }
  scope :expired_pending, -> { pending.where("created_at < ?", 12.hours.ago) }
end
