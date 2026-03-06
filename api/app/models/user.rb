class User < ApplicationRecord
  has_one :wallet, dependent: :destroy
  has_many :transactions
  has_many :game_entries
  has_many :games, through: :game_entries

  validates :discord_id, presence: true, uniqueness: true
  validates :username, presence: true

  after_create :create_wallet

  def balance
    wallet&.balance_usdc || 0
  end

  def debit!(amount)
    raise "Insufficient balance" if balance < amount

    wallet.with_lock do
      wallet.decrement!(:balance_usdc, amount)
    end
  end

  def credit!(amount)
    wallet.with_lock do
      wallet.increment!(:balance_usdc, amount)
    end
  end

  private

  def create_wallet
    build_wallet(balance_usdc: 0).save!
  end
end
