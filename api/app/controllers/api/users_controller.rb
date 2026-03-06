module Api
  class UsersController < ApplicationController
    def index
      users = User.includes(:wallet).all
      render json: users.map { |u| user_json(u) }
    end

    def show
      user = User.find_by!(discord_id: params[:discord_id])
      render json: user_json(user)
    end

    def create
      user = User.find_or_initialize_by(discord_id: params[:discord_id])
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
        discord_id: user.discord_id,
        username: user.username,
        eth_address: user.eth_address,
        balance_usdc: user.balance.to_s
      }
    end
  end
end
