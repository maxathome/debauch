module Api
  class GamesController < ApplicationController
    PAYOUT_MULTIPLIER = BigDecimal("2.0")
    PROFIT_MULTIPLIER = BigDecimal("1.0")
    VALID_CHOICES = %w[heads tails].freeze

    RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].freeze
    VALID_ROULETTE_BETS = %w[number red black odd even low high].freeze

    def roulette
      user      = User.find_by!(discord_id: params[:discord_id])
      amount    = BigDecimal(params[:amount].to_s)
      bet_type  = params[:bet_type].to_s.downcase
      bet_value = params[:bet_value]&.to_s&.downcase

      return render json: { error: "Invalid bet type" }, status: :unprocessable_entity unless VALID_ROULETTE_BETS.include?(bet_type)
      return render json: { error: "Bet must be greater than 0" }, status: :unprocessable_entity unless amount > 0

      if bet_type == "number"
        return render json: { error: "bet_value required for number bets" }, status: :unprocessable_entity if bet_value.nil?
        number = Integer(bet_value) rescue nil
        return render json: { error: "Number must be 0-36" }, status: :unprocessable_entity unless number&.between?(0, 36)
        payout_multiplier     = BigDecimal("36")
        house_loss_multiplier = BigDecimal("35")
      else
        payout_multiplier     = BigDecimal("2")
        house_loss_multiplier = BigDecimal("1")
      end

      potential_house_loss = amount * house_loss_multiplier
      return render json: { error: "House is out of funds — games are closed" }, status: :unprocessable_entity unless HouseBalance.can_cover?(potential_house_loss)

      spin = SecureRandom.random_number(37)
      won  = case bet_type
             when "number" then spin == number
             when "red"    then RED_NUMBERS.include?(spin)
             when "black"  then spin != 0 && !RED_NUMBERS.include?(spin)
             when "odd"    then spin != 0 && spin.odd?
             when "even"   then spin != 0 && spin.even?
             when "low"    then spin.between?(1, 18)
             when "high"   then spin.between?(19, 36)
             end

      ActiveRecord::Base.transaction do
        user.debit!(amount)

        if won
          payout = (amount * payout_multiplier).round(6)
          HouseBalance.debit!(potential_house_loss)
          user.credit!(payout)
          user.transactions.create!(amount_usdc: payout, tx_type: "game_win", status: "confirmed", tx_hash: nil)
        else
          HouseBalance.credit!(amount)
          user.transactions.create!(amount_usdc: amount, tx_type: "game_loss", status: "confirmed", tx_hash: nil)
        end
      end

      render json: {
        spin:               spin,
        spin_color:         roulette_color(spin),
        bet_type:           bet_type,
        bet_value:          bet_value,
        won:                won,
        amount:             amount.to_s,
        payout:             won ? (amount * payout_multiplier).round(6).to_s : "0.0",
        balance_usdc:       user.reload.balance.to_s,
        house_balance_usdc: HouseBalance.instance.balance_usdc.to_s
      }
    rescue ArgumentError
      render json: { error: "Invalid amount" }, status: :unprocessable_entity
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

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

    private

    def roulette_color(number)
      return "green" if number == 0
      RED_NUMBERS.include?(number) ? "red" : "black"
    end
  end
end
