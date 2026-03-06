module Api
  class WalletsController < ApplicationController
    # GET /api/users/:discord_id/wallet
    def show
      user = User.find_by!(discord_id: params[:discord_id])
      render json: {
        balance_usdc: user.balance.to_s,
        eth_address: user.eth_address,
        transactions: user.transactions.order(created_at: :desc).limit(10).map do |t|
          { type: t.tx_type, amount: t.amount_usdc.to_s, status: t.status, created_at: t.created_at }
        end
      }
    end

    # POST /api/users/:discord_id/wallet/deposit
    # Called after confirming an on-chain deposit
    def deposit
      user = User.find_by!(discord_id: params[:discord_id])
      amount = BigDecimal(params[:amount].to_s)

      ActiveRecord::Base.transaction do
        user.credit!(amount)
        user.transactions.create!(
          amount_usdc: amount,
          tx_type: "deposit",
          status: "confirmed",
          tx_hash: params[:tx_hash]
        )
      end

      render json: { balance_usdc: user.reload.balance.to_s }
    end

    # POST /api/users/:discord_id/wallet/withdraw
    def withdraw
      user = User.find_by!(discord_id: params[:discord_id])
      amount = BigDecimal(params[:amount].to_s)
      to_address = params[:to_address]

      ActiveRecord::Base.transaction do
        user.debit!(amount)
        user.transactions.create!(
          amount_usdc: amount,
          tx_type: "withdrawal",
          status: "pending",
          tx_hash: nil
        )
      end

      # Return the withdrawal request — bot will submit the on-chain tx
      render json: { status: "pending", amount_usdc: amount.to_s, to_address: to_address }
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end
end
