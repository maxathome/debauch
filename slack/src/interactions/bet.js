const axios = require("axios");
const b = require("../blocks");
const api = require("../api");
const betContract = require("../services/bet-contract");

const SLACK_TOKEN = () => process.env.SLACK_BOT_TOKEN;

async function getUserInfo(userId) {
  const resp = await axios.get(`https://slack.com/api/users.info?user=${userId}`, {
    headers: { Authorization: `Bearer ${SLACK_TOKEN()}` },
  });
  const profile = resp.data.user?.profile;
  return {
    name: profile?.display_name || profile?.real_name || userId,
    avatar: profile?.image_48,
  };
}

function formatResolveAfter(unixTs) {
  return `<!date^${unixTs}^{date_short_pretty} at {time}|${new Date(unixTs * 1000).toLocaleString()}>`;
}

async function dmUser(userId, blocks, fallback) {
  await axios.post(
    "https://slack.com/api/chat.postMessage",
    { channel: userId, text: fallback, blocks },
    { headers: { Authorization: `Bearer ${SLACK_TOKEN()}` } }
  );
}

async function postToChannel(channelId, blocks, fallback) {
  await axios.post(
    "https://slack.com/api/chat.postMessage",
    { channel: channelId, text: fallback, blocks },
    { headers: { Authorization: `Bearer ${SLACK_TOKEN()}` } }
  );
}

// Modal submission: bet_create
async function onBetCreate(payload, res) {
  const values = payload.view.state.values;
  const meta = JSON.parse(payload.view.private_metadata);

  const description    = values.bet_description.description.value?.trim();
  const player1WinsIf  = values.bet_p1_wins_if.player1_wins_if.value?.trim();
  const player2WinsIf  = values.bet_p2_wins_if.player2_wins_if.value?.trim();
  const amountStr      = values.bet_amount.amount.value?.trim();
  const opponentId     = values.bet_opponent.opponent.selected_user;
  const arbitratorId   = values.bet_arbitrator.arbitrator.selected_user;
  const resolveAfter   = values.bet_resolve_after.resolve_after.selected_date_time;

  const amount = parseFloat(amountStr);

  if (!description || !player1WinsIf || !player2WinsIf || isNaN(amount) || amount <= 0) {
    return res.json({
      response_action: "errors",
      errors: {
        bet_description:  !description   ? "Please describe the bet"           : undefined,
        bet_p1_wins_if:   !player1WinsIf ? "Enter your win condition"           : undefined,
        bet_p2_wins_if:   !player2WinsIf ? "Enter their win condition"          : undefined,
        bet_amount:       isNaN(amount) || amount <= 0 ? "Enter a valid amount" : undefined,
      },
    });
  }

  // Validation disabled for testing — re-enable before going to prod:
  // if (opponentId === meta.player1_id) { ... }
  // if (arbitratorId === meta.player1_id || arbitratorId === opponentId) { ... }

  res.json({ response_action: "clear" });

  try {
    const [p1Info, p2Info, arbInfo] = await Promise.all([
      getUserInfo(meta.player1_id),
      getUserInfo(opponentId),
      getUserInfo(arbitratorId),
    ]);

    // Ensure all users exist in the DB
    await Promise.all([
      api.getOrCreateUser(meta.player1_id, p1Info.name),
      api.getOrCreateUser(opponentId, p2Info.name),
      api.getOrCreateUser(arbitratorId, arbInfo.name),
    ]);

    // 1. Debit p1 and create bet in DB (status: pending_acceptance)
    const bet = await api.createBet({
      player1_id:          meta.player1_id,
      player2_id:          opponentId,
      arbitrator_id:       arbitratorId,
      player1_username:    p1Info.name,
      player2_username:    p2Info.name,
      arbitrator_username: arbInfo.name,
      description,
      player1_wins_if:     player1WinsIf,
      player2_wins_if:     player2WinsIf,
      amount_usdc:         amount,
      resolve_after:       resolveAfter,
      channel_id:          meta.channel_id,
    });

    // 2. Escrow p1's funds on-chain (non-blocking — DM goes out regardless)
    betContract.createBet(resolveAfter, amount)
      .then(async (contractBetId) => {
        await api.updateBetContractId(bet.id, contractBetId);
        // If p2 accepted while contract was still processing, activate now
        const current = await api.getBet(bet.id);
        if (current.status === "active") {
          await betContract.activateBet(contractBetId, parseFloat(current.amount_usdc));
          console.log(`[bet] Late-activated contract bet #${contractBetId} for bet #${bet.id}`);
        }
      })
      .catch((err) => {
        console.error(`[bet] Contract createBet failed for bet #${bet.id}:`, err.message);
        const isGas = err.message?.toLowerCase().includes("insufficient funds") || err.code === "INSUFFICIENT_FUNDS";
        const msg = isGas
          ? ":warning: Your bet was created but the on-chain escrow failed — the bot wallet doesn't have enough ETH for gas. Ask an admin to top it up, then the funds will be escrowed on the next retry."
          : `:warning: Your bet was created but the on-chain escrow failed: ${err.message}`;
        dmUser(meta.player1_id, [b.text(msg)], "Escrow failed").catch(() => {});
      });

    // 3. DM player 2 with Accept / Decline
    const dmBlocks = [
      b.text(`🎲 *You've been challenged to a bet!*`),
      p1Info.avatar
        ? { type: "context", elements: [{ type: "image", image_url: p1Info.avatar, alt_text: p1Info.name }, { type: "mrkdwn", text: `*${p1Info.name}* wants to bet you *$${amount} USDC* each` }] }
        : b.text(`*${p1Info.name}* wants to bet you *$${amount} USDC* each`),
      b.text(`> ${description}`),
      b.fields(
        [`🏆 ${p1Info.name} wins if`, player1WinsIf],
        [`🏆 ${p2Info.name} wins if`, player2WinsIf],
        ["Arbitrator", arbInfo.name],
        ["Resolve after", formatResolveAfter(resolveAfter)]
      ),
      b.actions(
        b.button("✅  Accept", "bet_accept", String(bet.id), "primary"),
        b.button("❌  Decline", "bet_decline", String(bet.id), "danger")
      ),
      b.context(`Bet ID: ${bet.id}`),
    ];

    await dmUser(opponentId, dmBlocks, `${p1Info.name} wants to bet you $${amount} USDC — "${description}"`);

    console.log(`[bet] Created bet #${bet.id}, DM sent to ${opponentId}`);
  } catch (err) {
    console.error("[bet] onBetCreate error:", err.message, err.response?.data);
  }
}

// Block action: bet_accept
async function onAccept(payload, action) {
  const betId = action.value;
  const acceptorId = payload.user.id;

  try {
    const [acceptorInfo] = await Promise.all([getUserInfo(acceptorId)]);

    // 2. Debit p2 and activate bet in DB
    const bet = await api.acceptBet(betId);

    // 3. Activate on-chain (non-blocking)
    if (bet.contract_bet_id != null) {
      betContract.activateBet(bet.contract_bet_id, parseFloat(bet.amount_usdc))
        .catch((err) => {
          console.error(`[bet] Contract activateBet failed for bet #${bet.id}:`, err.message);
          const isGas = err.message?.toLowerCase().includes("insufficient funds") || err.code === "INSUFFICIENT_FUNDS";
          const msg = isGas
            ? ":warning: Bet accepted but on-chain escrow failed — the bot wallet doesn't have enough ETH for gas. Ask an admin to top it up."
            : `:warning: Bet accepted but on-chain escrow failed: ${err.message}`;
          dmUser(acceptorId, [b.text(msg)], "Escrow failed").catch(() => {});
        });
    }

    const [p1Info, arbInfo] = await Promise.all([
      getUserInfo(bet.player1_id),
      getUserInfo(bet.arbitrator_id),
    ]);

    const resolveAfterFmt = formatResolveAfter(bet.resolve_after);
    const totalPot = (parseFloat(bet.amount_usdc) * 2).toFixed(2);

    // 4. Post to channel
    const channelBlocks = [
      b.text("🤝 *A bet has been made!*"),
      b.text(`> ${bet.description}`),
      b.fields(
        [`🏆 ${p1Info.name} wins if`, bet.player1_wins_if],
        [`🏆 ${acceptorInfo.name} wins if`, bet.player2_wins_if],
        ["💰 Pot", `$${totalPot} USDC`],
        ["👨‍⚖️ Arbitrator", arbInfo.name],
        ["⏰ Resolve after", resolveAfterFmt]
      ),
      b.context(`Bet ID: ${bet.id}`),
    ];

    await postToChannel(bet.channel_id, channelBlocks, `Bet is ON: ${bet.description}`);

    // 5. DM arbitrator with resolve buttons
    const arbBlocks = [
      b.text("👨‍⚖️ *You've been named arbitrator for a bet*"),
      b.text(`> ${bet.description}`),
      b.fields(
        [`🏆 ${p1Info.name} wins if`, bet.player1_wins_if],
        [`🏆 ${acceptorInfo.name} wins if`, bet.player2_wins_if],
        ["💰 Pot", `$${totalPot} USDC`],
        ["⏰ Can resolve after", resolveAfterFmt]
      ),
      b.text("_Once the resolve time passes, use the buttons below to declare a winner or cancel the bet._"),
      b.actions(
        b.button(`🏆  ${p1Info.name} Wins`, "bet_resolve_p1", String(bet.id), "primary"),
        b.button(`🏆  ${acceptorInfo.name} Wins`, "bet_resolve_p2", String(bet.id), "primary"),
        b.button("🚫  Cancel Bet", "bet_cancel", String(bet.id), "danger")
      ),
      b.context(`Bet ID: ${bet.id}`),
    ];

    await dmUser(bet.arbitrator_id, arbBlocks, `You're the arbitrator for: "${bet.description}"`);

    console.log(`[bet] Bet #${betId} accepted and active`);
  } catch (err) {
    console.error("[bet] onAccept error:", err.message, err.response?.data);
    await dmUser(acceptorId, [b.text(`:warning: Could not accept bet: ${err.response?.data?.error || err.message}`)], "Error accepting bet");
  }
}

// Block action: bet_decline
async function onDecline(payload, action) {
  const betId = action.value;

  try {
    const bet = await api.declineBet(betId);

    const p1Info = await getUserInfo(bet.player1_id);

    await dmUser(bet.player1_id, [
      b.text(`❌ *Bet declined*`),
      b.text(`> ${bet.description}`),
      b.text(`Your $${bet.amount_usdc} USDC has been refunded.`),
      b.context(`Bet ID: ${betId}`),
    ], `${payload.user.name} declined your bet`);

    console.log(`[bet] Bet #${betId} declined`);
  } catch (err) {
    console.error("[bet] onDecline error:", err.message);
  }
}

// Block action: bet_resolve_p1 or bet_resolve_p2
async function onResolve(payload, action, winner) {
  const betId = action.value;
  const arbitratorId = payload.user.id;

  try {
    const bet = await api.getBet(betId);

    const now = Math.floor(Date.now() / 1000);
    if (now < bet.resolve_after) {
      const resolveAt = formatResolveAfter(bet.resolve_after);
      await dmUser(arbitratorId, [
        b.text(`:hourglass: *Too early to resolve*\nThis bet can't be resolved until ${resolveAt}.`),
      ], "Too early to resolve");
      return;
    }

    const winnerId = winner === "p1" ? bet.player1_id : bet.player2_id;

    // Resolve on-chain if escrow was successfully created
    if (bet.contract_bet_id != null) {
      await betContract.resolveBet(bet.contract_bet_id);
    }

    // Credit winner in DB
    const resolved = await api.resolveBet(betId, winnerId);

    const [p1Info, p2Info] = await Promise.all([
      getUserInfo(bet.player1_id),
      getUserInfo(bet.player2_id),
    ]);

    const winnerInfo = winner === "p1" ? p1Info : p2Info;
    const loserInfo  = winner === "p1" ? p2Info : p1Info;
    const totalPot   = (parseFloat(bet.amount_usdc) * 2).toFixed(2);

    const channelBlocks = [
      b.text("🎉 *Bet resolved!*"),
      b.text(`> ${bet.description}`),
      winnerInfo.avatar
        ? { type: "context", elements: [{ type: "image", image_url: winnerInfo.avatar, alt_text: winnerInfo.name }, { type: "mrkdwn", text: `🏆 <@${winnerId}> wins *$${totalPot} USDC*!` }] }
        : b.text(`🏆 <@${winnerId}> wins *$${totalPot} USDC*!`),
      b.fields(
        ["Winner", `<@${winnerId}>`],
        ["Winner's condition", winner === "p1" ? bet.player1_wins_if : bet.player2_wins_if],
        ["Pot", `$${totalPot} USDC`]
      ),
      b.context(`Bet ID: ${betId}`),
    ];

    await postToChannel(bet.channel_id, channelBlocks, `${winnerInfo.name} wins the bet!`);
    console.log(`[bet] Bet #${betId} resolved — winner: ${winnerId}`);
  } catch (err) {
    console.error("[bet] onResolve error:", err.message, err.response?.data);
    const msg = err.response?.data?.error || err.message;
    await dmUser(arbitratorId, [b.text(`:warning: Could not resolve bet: ${msg}`)], "Error resolving bet");
  }
}

// Block action: bet_cancel
async function onCancel(payload, action) {
  const betId = action.value;
  const arbitratorId = payload.user.id;

  try {
    const bet = await api.getBet(betId);

    // Cancel on-chain if escrow was successfully created
    if (bet.contract_bet_id != null) {
      await betContract.cancelBet(bet.contract_bet_id);
    }

    // Refund internally
    await api.cancelBet(betId);

    const [p1Info, p2Info] = await Promise.all([
      getUserInfo(bet.player1_id),
      getUserInfo(bet.player2_id),
    ]);

    const channelBlocks = [
      b.text("🚫 *Bet cancelled*"),
      b.text(`> ${bet.description}`),
      b.text(`Both players have been refunded $${bet.amount_usdc} USDC.`),
      b.context(`Bet ID: ${betId}`),
    ];

    if (bet.status === "active") {
      await postToChannel(bet.channel_id, channelBlocks, "Bet cancelled");
    }

    await Promise.all([
      dmUser(bet.player1_id, [b.text(`🚫 Your bet was cancelled by the arbitrator.\n> ${bet.description}\nYou've been refunded $${bet.amount_usdc} USDC.`), b.context(`Bet ID: ${betId}`)], "Bet cancelled"),
      dmUser(bet.player2_id, [b.text(`🚫 Your bet was cancelled by the arbitrator.\n> ${bet.description}\nYou've been refunded $${bet.amount_usdc} USDC.`), b.context(`Bet ID: ${betId}`)], "Bet cancelled"),
    ]);

    console.log(`[bet] Bet #${betId} cancelled`);
  } catch (err) {
    console.error("[bet] onCancel error:", err.message, err.response?.data);
    await dmUser(arbitratorId, [b.text(`:warning: Could not cancel bet: ${err.response?.data?.error || err.message}`)], "Error cancelling bet");
  }
}

module.exports = { onBetCreate, onAccept, onDecline, onResolve, onCancel };
