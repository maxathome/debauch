module Api
  module Admin
    class UnknownDepositsController < ApplicationController
      def create
        deposit = UnknownDeposit.find_or_initialize_by(tx_hash: params[:tx_hash])
        return render json: deposit_json(deposit) if deposit.persisted?

        deposit.assign_attributes(
          sender_address: params[:sender_address].downcase,
          amount_usdc: params[:amount_usdc],
          block_number: params[:block_number]
        )
        deposit.save!
        render json: deposit_json(deposit), status: :created
      end

      def index
        deposits = UnknownDeposit.includes(:resolved_user).order(created_at: :desc)
        render json: deposits.map { |d| deposit_json(d) }
      end

      def assign_to_user
        deposit = UnknownDeposit.pending.find(params[:id])
        user = User.find_by!(discord_id: params[:discord_id])

        ActiveRecord::Base.transaction do
          user.credit!(deposit.amount_usdc)
          user.transactions.create!(
            amount_usdc: deposit.amount_usdc,
            tx_type: "deposit",
            status: "confirmed",
            tx_hash: deposit.tx_hash
          )
          deposit.update!(status: "resolved", resolved_to: "user", resolved_user: user)
        end

        render json: deposit_json(deposit.reload)
      end

      def assign_to_house
        deposit = UnknownDeposit.pending.find(params[:id])

        ActiveRecord::Base.transaction do
          HouseBalance.credit!(deposit.amount_usdc)
          deposit.update!(status: "resolved", resolved_to: "house")
        end

        render json: deposit_json(deposit.reload)
      end

      private

      def deposit_json(deposit)
        {
          id: deposit.id,
          sender_address: deposit.sender_address,
          amount_usdc: deposit.amount_usdc.to_s,
          tx_hash: deposit.tx_hash,
          block_number: deposit.block_number,
          status: deposit.status,
          resolved_to: deposit.resolved_to,
          resolved_user: deposit.resolved_user&.username,
          created_at: deposit.created_at
        }
      end
    end
  end
end
