// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/// @title BetEscrow
/// @notice Holds USDC in escrow for peer-to-peer bets arbitrated by a third party.
///         The bot wallet (owner) is the sole on-chain actor — all Slack users interact
///         through the bot, which manages internal balances.
contract BetEscrow {
    address public immutable owner;
    IERC20 public immutable usdc;

    enum Status { Pending, Active, Resolved, Cancelled }

    struct Bet {
        uint256 p1Stake;       // USDC (6 decimals) deposited by player 1
        uint256 p2Stake;       // USDC (6 decimals) deposited by player 2
        uint256 resolveAfter;  // Unix timestamp — arbitrator cannot resolve before this
        uint256 createdAt;     // Used to enforce 12-hour acceptance window
        Status  status;
    }

    mapping(uint256 => Bet) public bets;
    uint256 public nextBetId;

    event BetCreated(uint256 indexed betId, uint256 resolveAfter, uint256 p1Stake);
    event BetActivated(uint256 indexed betId, uint256 totalStake);
    event BetResolved(uint256 indexed betId, uint256 totalPot);
    event BetCancelled(uint256 indexed betId, uint256 refunded);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _usdc) {
        owner = msg.sender;
        usdc = IERC20(_usdc);
    }

    /// @notice Step 1: Player 1 creates the bet and deposits their stake.
    /// @param resolveAfter Unix timestamp after which the arbitrator may resolve.
    /// @param p1Amount     Player 1's stake in USDC (6 decimals).
    /// @return betId       The on-chain ID for this bet.
    function createBet(uint256 resolveAfter, uint256 p1Amount)
        external
        onlyOwner
        returns (uint256 betId)
    {
        require(p1Amount > 0, "Stake must be > 0");
        require(resolveAfter > block.timestamp, "resolveAfter must be in the future");

        usdc.transferFrom(owner, address(this), p1Amount);

        betId = nextBetId++;
        bets[betId] = Bet({
            p1Stake:      p1Amount,
            p2Stake:      0,
            resolveAfter: resolveAfter,
            createdAt:    block.timestamp,
            status:       Status.Pending
        });

        emit BetCreated(betId, resolveAfter, p1Amount);
    }

    /// @notice Step 2: Player 2 accepts the bet and deposits their stake.
    ///         Must be called within 12 hours of bet creation.
    function activateBet(uint256 betId, uint256 p2Amount) external onlyOwner {
        Bet storage bet = bets[betId];
        require(bet.status == Status.Pending, "Bet not pending");
        require(block.timestamp < bet.createdAt + 12 hours, "Acceptance window expired");
        require(p2Amount > 0, "Stake must be > 0");

        usdc.transferFrom(owner, address(this), p2Amount);
        bet.p2Stake = p2Amount;
        bet.status  = Status.Active;

        emit BetActivated(betId, bet.p1Stake + p2Amount);
    }

    /// @notice Arbitrator picks a winner. Full pot returned to owner (bot distributes internally).
    ///         Cannot be called before resolveAfter.
    function resolveBet(uint256 betId) external onlyOwner {
        Bet storage bet = bets[betId];
        require(bet.status == Status.Active, "Bet not active");
        require(block.timestamp >= bet.resolveAfter, "Too early to resolve");

        uint256 pot = bet.p1Stake + bet.p2Stake;
        bet.status = Status.Resolved;
        usdc.transfer(owner, pot);

        emit BetResolved(betId, pot);
    }

    /// @notice Arbitrator cancels the bet at any time. All stakes returned to owner.
    function cancelBet(uint256 betId) external onlyOwner {
        Bet storage bet = bets[betId];
        require(
            bet.status == Status.Pending || bet.status == Status.Active,
            "Cannot cancel"
        );

        uint256 refund = bet.p1Stake + bet.p2Stake;
        bet.status = Status.Cancelled;
        if (refund > 0) usdc.transfer(owner, refund);

        emit BetCancelled(betId, refund);
    }

    /// @notice Anyone may call this to expire a pending bet after the 12-hour window.
    ///         Player 1's stake is returned to the owner (bot refunds internally).
    function expireBet(uint256 betId) external {
        Bet storage bet = bets[betId];
        require(bet.status == Status.Pending, "Bet not pending");
        require(block.timestamp >= bet.createdAt + 12 hours, "Not yet expired");

        uint256 refund = bet.p1Stake;
        bet.status = Status.Cancelled;
        usdc.transfer(owner, refund);

        emit BetCancelled(betId, refund);
    }
}
