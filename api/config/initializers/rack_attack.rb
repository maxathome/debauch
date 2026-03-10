class Rack::Attack
  # Throttle coinflip/roulette to 30 per minute per user (platform_user_id in body)
  throttle("games/ip", limit: 30, period: 60) do |req|
    if req.path.start_with?("/api/games/")
      req.ip
    end
  end

  # Throttle withdrawals to 5 per minute per IP
  throttle("withdrawals/ip", limit: 5, period: 60) do |req|
    if req.path.include?("/wallet/withdraw")
      req.ip
    end
  end

  # Throttle bet creation to 10 per minute per IP
  throttle("bets/ip", limit: 10, period: 60) do |req|
    if req.path == "/api/bets" && req.post?
      req.ip
    end
  end

  self.throttled_responder = lambda do |_req|
    [429, { "Content-Type" => "application/json" }, ['{"error":"Too many requests — slow down."}']]
  end
end
