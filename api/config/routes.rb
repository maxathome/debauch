Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    get  "users",             to: "users#index"
    get  "users/:discord_id", to: "users#show"
    post "users",             to: "users#create"

    get  "users/:discord_id/wallet",          to: "wallets#show"
    post "users/:discord_id/wallet/deposit",  to: "wallets#deposit"
    post "users/:discord_id/wallet/withdraw", to: "wallets#withdraw"

    post "games/coinflip", to: "games#coinflip"

    get  "house",      to: "house#show"
    post "house/fund", to: "house#fund"
  end
end
