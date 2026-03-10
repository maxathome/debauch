module Api
  class WalletsController < ApplicationController
    MIN_DONATION = BigDecimal("0.01")
    MAX_DONATION = BigDecimal("100.00")
    MIN_WITHDRAWAL = BigDecimal("0.01")
    # GET /api/users/:platform_user_id/wallet
    def show
      user = User.find_by!(platform_user_id: params[:platform_user_id])
      render json: {
        balance_usdc: user.balance.to_s,
        eth_address: user.eth_address,
        transactions: user.transactions.order(created_at: :desc).limit(10).map do |t|
          { type: t.tx_type, amount: t.amount_usdc.to_s, status: t.status, created_at: t.created_at }
        end
      }
    end

    # POST /api/users/:platform_user_id/wallet/deposit
    # Called after confirming an on-chain deposit
    def deposit
      user = User.find_by!(platform_user_id: params[:platform_user_id])
      amount = BigDecimal(params[:amount].to_s)
      tx_hash = params[:tx_hash]

      return render json: { balance_usdc: user.balance.to_s, duplicate: true } if Transaction.exists?(tx_hash: tx_hash)

      ActiveRecord::Base.transaction do
        user.credit!(amount)
        user.transactions.create!(
          amount_usdc: amount,
          tx_type: "deposit",
          status: "confirmed",
          tx_hash: tx_hash
        )
      end

      render json: { balance_usdc: user.reload.balance.to_s }
    end

    # POST /api/users/:platform_user_id/wallet/donate
    def donate
      user = User.find_by!(platform_user_id: params[:platform_user_id])
      amount = BigDecimal(params[:amount].to_s)

      return render json: { error: "Donation must be between $#{MIN_DONATION} and $#{MAX_DONATION} USDC" }, status: :unprocessable_entity unless amount.between?(MIN_DONATION, MAX_DONATION)

      ActiveRecord::Base.transaction do
        user.debit!(amount)
        HouseBalance.credit!(amount)
        user.transactions.create!(
          amount_usdc: amount,
          tx_type: "donation",
          status: "confirmed",
          tx_hash: nil
        )
      end

      render json: {
        balance_usdc: user.reload.balance.to_s,
        house_balance_usdc: HouseBalance.instance.balance_usdc.to_s
      }
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # POST /api/users/:platform_user_id/wallet/withdraw
    # Called after the on-chain transfer is confirmed. tx_hash is required.
    def withdraw
      user = User.find_by!(platform_user_id: params[:platform_user_id])
      amount = BigDecimal(params[:amount].to_s)
      to_address = params[:to_address]
      tx_hash = params[:tx_hash]

      return render json: { error: "Withdrawal must be at least $#{MIN_WITHDRAWAL} USDC" }, status: :unprocessable_entity unless amount >= MIN_WITHDRAWAL
      return render json: { error: "Invalid wallet address" }, status: :unprocessable_entity unless to_address&.match?(/\A0x[0-9a-fA-F]{40}\z/)
      return render json: { error: "tx_hash is required" }, status: :unprocessable_entity if tx_hash.blank?

      ActiveRecord::Base.transaction do
        user.debit!(amount)
        user.transactions.create!(
          amount_usdc: amount,
          tx_type: "withdrawal",
          status: "confirmed",
          tx_hash: tx_hash
        )
      end

      render json: { status: "confirmed", amount_usdc: amount.to_s, to_address: to_address, tx_hash: tx_hash }
    rescue RuntimeError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end
end
