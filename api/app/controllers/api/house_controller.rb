module Api
  class HouseController < ApplicationController
    def show
      render json: { balance_usdc: HouseBalance.instance.balance_usdc.to_s }
    end

    def fund
      amount = BigDecimal(params[:amount].to_s)
      return render json: { error: "Amount must be greater than 0" }, status: :unprocessable_entity unless amount > 0

      HouseBalance.credit!(amount)
      render json: { balance_usdc: HouseBalance.instance.balance_usdc.to_s }
    end
  end
end
