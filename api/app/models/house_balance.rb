class HouseBalance < ApplicationRecord
  PROFIT_MULTIPLIER = BigDecimal("0.9")

  def self.instance
    first_or_create!(balance_usdc: 0)
  end

  def self.can_cover?(bet_amount)
    instance.balance_usdc >= bet_amount * PROFIT_MULTIPLIER
  end

  def self.credit!(amount)
    instance.with_lock { instance.increment!(:balance_usdc, amount) }
  end

  def self.debit!(amount)
    instance.with_lock { instance.decrement!(:balance_usdc, amount) }
  end
end
