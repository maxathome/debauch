module Api
  class BetsController < ApplicationController
    # GET /api/bets/:id
    def show
      bet = Bet.find(params[:id])
      render json: bet_json(bet)
    end

    # PATCH /api/bets/:id/set_contract_id
    def set_contract_id
      bet = Bet.find(params[:id])
      bet.update!(contract_bet_id: params[:contract_bet_id])
      render json: bet_json(bet)
    end

    # POST /api/bets
    # Player 1 creates a bet and their stake is debited.
    def create
      p1 = User.find_by!(platform_user_id: params[:player1_id])
      amount = BigDecimal(params[:amount_usdc].to_s)

      return render json: { error: "Amount must be > 0" }, status: :unprocessable_entity unless amount > 0

      bet = nil
      ActiveRecord::Base.transaction do
        p1.debit!(amount)
        p1.transactions.create!(
          amount_usdc: amount, tx_type: "bet_escrow", status: "confirmed", tx_hash: nil
        )
        bet = Bet.create!(
          player1_id:         params[:player1_id],
          player2_id:         params[:player2_id],
          arbitrator_id:      params[:arbitrator_id],
          player1_username:   params[:player1_username],
          player2_username:   params[:player2_username],
          arbitrator_username: params[:arbitrator_username],
          description:        params[:description],
          player1_wins_if:    params[:player1_wins_if],
          player2_wins_if:    params[:player2_wins_if],
          amount_usdc:        amount,
          resolve_after:      Time.at(params[:resolve_after].to_i),
          channel_id:         params[:channel_id],
          status:             "pending_acceptance"
        )
      end

      render json: bet_json(bet), status: :created
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # PATCH /api/bets/:id/accept
    # Player 2 accepts — their stake is debited and the bet goes active.
    def accept
      bet = Bet.find(params[:id])

      return render json: { error: "Bet is no longer pending" }, status: :unprocessable_entity unless bet.status == "pending_acceptance"
      return render json: { error: "Bet has expired" }, status: :unprocessable_entity if bet.created_at < 12.hours.ago

      p2 = User.find_by!(platform_user_id: bet.player2_id)

      ActiveRecord::Base.transaction do
        p2.debit!(bet.amount_usdc)
        p2.transactions.create!(
          amount_usdc: bet.amount_usdc, tx_type: "bet_escrow", status: "confirmed", tx_hash: nil
        )
        bet.update!(status: "active")
      end

      render json: bet_json(bet)
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # PATCH /api/bets/:id/resolve
    # Arbitrator picks a winner — winner gets the full pot.
    def resolve
      bet = Bet.find(params[:id])

      return render json: { error: "Bet is not active" }, status: :unprocessable_entity unless bet.status == "active"
      return render json: { error: "Too early to resolve" }, status: :unprocessable_entity if Time.current < bet.resolve_after

      winner_id = params[:winner_id]
      return render json: { error: "Invalid winner" }, status: :unprocessable_entity unless [bet.player1_id, bet.player2_id].include?(winner_id)

      winner = User.find_by!(platform_user_id: winner_id)
      pot    = bet.amount_usdc * 2

      ActiveRecord::Base.transaction do
        winner.credit!(pot)
        winner.transactions.create!(
          amount_usdc: pot, tx_type: "bet_win", status: "confirmed", tx_hash: nil
        )
        bet.update!(status: "resolved", winner_id: winner_id)
      end

      render json: bet_json(bet).merge(winner_username: bet.winner_id == bet.player1_id ? bet.player1_username : bet.player2_username)
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # PATCH /api/bets/:id/cancel
    # Arbitrator cancels — both players (or just p1 if still pending) are refunded.
    def cancel
      bet = Bet.find(params[:id])

      return render json: { error: "Bet cannot be cancelled" }, status: :unprocessable_entity unless %w[pending_acceptance active].include?(bet.status)

      ActiveRecord::Base.transaction do
        refund(bet.player1_id, bet.amount_usdc)

        if bet.status == "active"
          refund(bet.player2_id, bet.amount_usdc)
        end

        bet.update!(status: "cancelled")
      end

      render json: bet_json(bet)
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # PATCH /api/bets/:id/decline
    # Player 2 declines — p1 is refunded.
    def decline
      bet = Bet.find(params[:id])

      return render json: { error: "Bet is no longer pending" }, status: :unprocessable_entity unless bet.status == "pending_acceptance"

      ActiveRecord::Base.transaction do
        refund(bet.player1_id, bet.amount_usdc)
        bet.update!(status: "cancelled")
      end

      render json: bet_json(bet)
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # PATCH /api/bets/:id/expire
    # Called by the background poller for pending bets past the 12h window.
    def expire
      bet = Bet.find(params[:id])

      return render json: { error: "Bet is not pending" }, status: :unprocessable_entity unless bet.status == "pending_acceptance"
      return render json: { error: "Bet has not expired yet" }, status: :unprocessable_entity if bet.created_at >= 12.hours.ago

      ActiveRecord::Base.transaction do
        refund(bet.player1_id, bet.amount_usdc)
        bet.update!(status: "expired")
      end

      render json: bet_json(bet)
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # GET /api/bets/expired_pending
    # Returns pending bets that have passed the 12-hour acceptance window.
    def expired_pending
      bets = Bet.expired_pending
      render json: bets.map { |b| bet_json(b) }
    end

    private

    def refund(platform_user_id, amount)
      user = User.find_by!(platform_user_id: platform_user_id)
      user.credit!(amount)
      user.transactions.create!(
        amount_usdc: amount, tx_type: "bet_refund", status: "confirmed", tx_hash: nil
      )
    end

    def bet_json(bet)
      {
        id:                  bet.id,
        player1_id:          bet.player1_id,
        player2_id:          bet.player2_id,
        arbitrator_id:       bet.arbitrator_id,
        player1_username:    bet.player1_username,
        player2_username:    bet.player2_username,
        arbitrator_username: bet.arbitrator_username,
        description:         bet.description,
        player1_wins_if:     bet.player1_wins_if,
        player2_wins_if:     bet.player2_wins_if,
        amount_usdc:         bet.amount_usdc.to_s,
        status:              bet.status,
        resolve_after:       bet.resolve_after.to_i,
        channel_id:          bet.channel_id,
        contract_bet_id:     bet.contract_bet_id,
        winner_id:           bet.winner_id
      }
    end
  end
end
