module Api
  class UsersController < ApplicationController
    def index
      users = User.includes(:wallet).all
      render json: users.map { |u| user_json(u) }
    end

    def show
      user = User.find_by!(platform_user_id: params[:platform_user_id])
      render json: user_json(user)
    end

    def by_wallet
      user = User.find_by!(eth_address: params[:eth_address].downcase)
      render json: user_json(user)
    rescue ActiveRecord::RecordNotFound
      render json: { error: "No user registered with that wallet address" }, status: :not_found
    end

    def register_wallet
      user = User.find_by!(platform_user_id: params[:platform_user_id])
      eth_address = params[:eth_address].to_s

      unless eth_address.match?(/\A0x[0-9a-fA-F]{40}\z/)
        return render json: { error: "Invalid wallet address" }, status: :unprocessable_entity
      end

      user.update!(eth_address: eth_address.downcase)
      render json: user_json(user)
    end

    def create
      user = User.find_or_initialize_by(platform_user_id: params[:platform_user_id])
      user.username = params[:username]

      if user.save
        render json: user_json(user), status: :created
      else
        render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def user_json(user)
      {
        id: user.id,
        platform_user_id: user.platform_user_id,
        username: user.username,
        eth_address: user.eth_address,
        balance_usdc: user.balance.to_s
      }
    end
  end
end
