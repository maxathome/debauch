module Api
  class GamesController < ApplicationController
    PAYOUT_MULTIPLIER = BigDecimal("2.0")
    PROFIT_MULTIPLIER = BigDecimal("1.0")
    VALID_CHOICES = %w[heads tails].freeze

    def coinflip
      user   = User.find_by!(discord_id: params[:discord_id])
      amount = BigDecimal(params[:amount].to_s)
      choice = params[:choice].to_s.downcase

      return render json: { error: "Choice must be heads or tails" }, status: :unprocessable_entity unless VALID_CHOICES.include?(choice)
      return render json: { error: "Bet must be greater than 0" }, status: :unprocessable_entity unless amount > 0
      return render json: { error: "House is out of funds — games are closed" }, status: :unprocessable_entity unless HouseBalance.can_cover?(amount)

      result = SecureRandom.random_number(2) == 0 ? "heads" : "tails"
      won    = choice == result

      ActiveRecord::Base.transaction do
        user.debit!(amount)

        if won
          payout = (amount * PAYOUT_MULTIPLIER).round(6)
          HouseBalance.debit!(amount * PROFIT_MULTIPLIER)
          user.credit!(payout)
          user.transactions.create!(amount_usdc: payout, tx_type: "game_win", status: "confirmed", tx_hash: nil)
        else
          HouseBalance.credit!(amount)
          user.transactions.create!(amount_usdc: amount, tx_type: "game_loss", status: "confirmed", tx_hash: nil)
        end
      end

      render json: {
        choice: choice,
        result: result,
        won: won,
        amount: amount.to_s,
        payout: won ? (amount * PAYOUT_MULTIPLIER).round(6).to_s : "0.0",
        balance_usdc: user.reload.balance.to_s,
        house_balance_usdc: HouseBalance.instance.balance_usdc.to_s
      }
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end
end
