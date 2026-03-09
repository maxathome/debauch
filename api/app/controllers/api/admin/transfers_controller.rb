module Api
  module Admin
    class TransfersController < ApplicationController
      def transfer_from_house
        user   = User.find_by!(platform_user_id: params[:platform_user_id])
        amount = BigDecimal(params[:amount].to_s)

        return render json: { error: "Amount must be positive" }, status: :unprocessable_entity unless amount > 0
        return render json: { error: "House has insufficient funds" }, status: :unprocessable_entity unless HouseBalance.can_cover?(amount)

        ActiveRecord::Base.transaction do
          HouseBalance.debit!(amount)
          user.credit!(amount)
          user.transactions.create!(
            amount_usdc: amount,
            tx_type: "admin_transfer",
            status: "confirmed",
            tx_hash: nil
          )
        end

        render json: {
          username:           user.username,
          platform_user_id:   user.platform_user_id,
          amount:             amount.to_s,
          balance_usdc:       user.reload.balance.to_s,
          house_balance_usdc: HouseBalance.instance.balance_usdc.to_s,
        }
      rescue ArgumentError
        render json: { error: "Invalid amount" }, status: :unprocessable_entity
      rescue RuntimeError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
