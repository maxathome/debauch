class UnknownDeposit < ApplicationRecord
  belongs_to :resolved_user, class_name: "User", optional: true

  STATUSES = %w[pending resolved].freeze
  RESOLVED_TO = %w[user house].freeze

  validates :status, inclusion: { in: STATUSES }
  validates :tx_hash, uniqueness: true

  scope :pending, -> { where(status: "pending") }
end
