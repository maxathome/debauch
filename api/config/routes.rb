Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    get  "users",                              to: "users#index"
    get  "users/by_wallet/:eth_address",       to: "users#by_wallet"
    get  "users/:platform_user_id",                  to: "users#show"
    post "users",                              to: "users#create"
    post "users/:platform_user_id/register_wallet",  to: "users#register_wallet"

    get  "users/:platform_user_id/wallet",          to: "wallets#show"
    post "users/:platform_user_id/wallet/deposit",  to: "wallets#deposit"
    post "users/:platform_user_id/wallet/withdraw", to: "wallets#withdraw"
    post "users/:platform_user_id/wallet/donate",   to: "wallets#donate"

    get    "bets/expired_pending",      to: "bets#expired_pending"
    post   "bets",                      to: "bets#create"
    get    "bets/:id",                  to: "bets#show"
    patch  "bets/:id/accept",           to: "bets#accept"
    patch  "bets/:id/decline",          to: "bets#decline"
    patch  "bets/:id/resolve",          to: "bets#resolve"
    patch  "bets/:id/cancel",           to: "bets#cancel"
    patch  "bets/:id/expire",           to: "bets#expire"
    patch  "bets/:id/set_contract_id",  to: "bets#set_contract_id"

    post "games/coinflip",  to: "games#coinflip"
    post "games/picknum",   to: "games#picknum"
    post "games/roulette",  to: "games#roulette"

    get  "house",      to: "house#show"
    post "house/fund", to: "house#fund"

    namespace :admin do
      get  "unknown_deposits",                        to: "unknown_deposits#index"
      post "unknown_deposits",                        to: "unknown_deposits#create"
      post "unknown_deposits/:id/assign_to_user",     to: "unknown_deposits#assign_to_user"
      post "unknown_deposits/:id/assign_to_house",    to: "unknown_deposits#assign_to_house"
      post "transfer_from_house",                     to: "transfers#transfer_from_house"
    end
  end
end
