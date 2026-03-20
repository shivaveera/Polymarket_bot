import { NextRequest, NextResponse } from 'next/server';
import { checkMarketResolution, fetchBTCMarkets } from '@/lib/polymarket';
import { simulateResolution } from '@/lib/simulator';
import { getSettings, getOpenTrades, updateTradeResolution, updateSettings } from '@/lib/sheets';
import { sendTradeNotification } from '@/lib/notifications';
import { checkEarlyExit, simulateEarlyExit } from '@/lib/earlyexit';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    const openTrades = await getOpenTrades();

    if (openTrades.length === 0) {
      return NextResponse.json({ status: 'ok', message: 'No open trades' });
    }

    // Fetch current markets for early exit price checks
    let activeMarkets: Awaited<ReturnType<typeof fetchBTCMarkets>> = [];
    if (settings.early_exit_enabled) {
      try {
        activeMarkets = await fetchBTCMarkets();
      } catch {
        // If we can't fetch markets, skip early exit checks
      }
    }

    const results: { tradeId: string; market: string; status: string; pnl?: number }[] = [];
    let bankroll = settings.bankroll;

    for (const { trade, rowIndex } of openTrades) {
      // ===== EARLY EXIT CHECK =====
      if (settings.early_exit_enabled) {
        const currentMarket = activeMarkets.find(m => m.id === trade.market_id);
        if (currentMarket) {
          const secondsSinceEntry = (Date.now() - new Date(trade.timestamp).getTime()) / 1000;
          const minutesToResolution = (new Date(trade.end_time).getTime() - Date.now()) / 60000;

          const exitCheck = checkEarlyExit({
            entryPrice: trade.entry_price,
            currentYesPrice: currentMarket.yesPrice,
            secondsSinceEntry,
            minutesToResolution,
            settings,
          });

          if (exitCheck.shouldExit) {
            // Simulate the early exit
            const exitResult = simulateEarlyExit({
              entryPrice: trade.entry_price,
              sellPrice: exitCheck.currentPrice,
              betAmount: trade.amount_usd,
              settings,
            });

            // Update bankroll: return bet amount + net PnL from early exit
            bankroll += trade.amount_usd + exitResult.pnlNet;

            await updateTradeResolution(rowIndex, {
              status: 'exited_early',
              resolution: 'EARLY_EXIT',
              close_price: exitCheck.currentPrice,
              pnl_gross: exitResult.pnlNet + exitResult.takerFee + exitResult.gasFee,
              taker_fee: exitResult.takerFee,
              gas_fee: exitResult.gasFee,
              pnl_net: exitResult.pnlNet,
              bankroll_after: Math.round(bankroll * 100) / 100,
              exit_reason: exitCheck.reason,
              exit_price: exitCheck.currentPrice,
              savings_vs_hold: Math.round(exitCheck.savingsVsHold * 100) / 100,
            });

            // Send notification for early exit
            const exitedTrade = {
              ...trade,
              status: 'exited_early' as const,
              resolution: 'EARLY_EXIT',
              close_price: exitCheck.currentPrice,
              pnl_net: exitResult.pnlNet,
              pnl_gross: exitResult.pnlNet + exitResult.takerFee + exitResult.gasFee,
              taker_fee: exitResult.takerFee,
              gas_fee: exitResult.gasFee,
              bankroll_after: Math.round(bankroll * 100) / 100,
              exit_reason: exitCheck.reason,
              exit_price: exitCheck.currentPrice,
              savings_vs_hold: Math.round(exitCheck.savingsVsHold * 100) / 100,
            };
            await sendTradeNotification(exitedTrade, settings);

            results.push({
              tradeId: trade.id,
              market: trade.question,
              status: `exited_early:${exitCheck.reason}`,
              pnl: exitResult.pnlNet,
            });

            continue;  // Don't check resolution for this trade
          }
        }
      }

      // ===== NORMAL RESOLUTION CHECK =====
      // Check if market has resolved
      const resolution = await checkMarketResolution(trade.market_id);

      // Also check if end_time has passed (force resolve)
      const endTime = new Date(trade.end_time);
      const isExpired = endTime <= new Date();

      if (!resolution.resolved && !isExpired) {
        results.push({ tradeId: trade.id, market: trade.question, status: 'still_open' });
        continue;
      }

      // If expired but no resolution data, check one more time with a delay
      if (isExpired && !resolution.resolved) {
        const minutesPastEnd = (Date.now() - endTime.getTime()) / (1000 * 60);
        if (minutesPastEnd < 5) {
          results.push({ tradeId: trade.id, market: trade.question, status: 'awaiting_resolution' });
          continue;
        }
      }

      // Determine outcome
      const outcome = resolution.outcome || 'NO'; // Default to NO if can't determine

      // Simulate PnL
      const sim = simulateResolution({
        entryPrice: trade.entry_price,
        betAmount: trade.amount_usd,
        outcome,
        settings,
        isMaker: trade.is_maker,
      });

      // Update bankroll: add back bet amount + net PnL
      bankroll += trade.amount_usd + sim.pnlNet;

      await updateTradeResolution(rowIndex, {
        status: outcome === 'YES' ? 'won' : 'lost',
        resolution: outcome,
        close_price: sim.closePrice,
        pnl_gross: sim.pnlGross,
        taker_fee: sim.takerFee,
        gas_fee: sim.gasFee,
        pnl_net: sim.pnlNet,
        bankroll_after: Math.round(bankroll * 100) / 100,
        is_maker: sim.isMaker,
        maker_rebate: sim.makerRebate,
      });

      // Send notification for resolved trade
      const resolvedTrade = {
        ...trade,
        status: (outcome === 'YES' ? 'won' : 'lost') as 'won' | 'lost',
        resolution: outcome,
        close_price: sim.closePrice,
        pnl_gross: sim.pnlGross,
        pnl_net: sim.pnlNet,
        taker_fee: sim.takerFee,
        gas_fee: sim.gasFee,
        bankroll_after: Math.round(bankroll * 100) / 100,
      };
      await sendTradeNotification(resolvedTrade, settings);

      results.push({
        tradeId: trade.id,
        market: trade.question,
        status: outcome === 'YES' ? 'won' : 'lost',
        pnl: sim.pnlNet,
      });
    }

    // Update bankroll and peak in settings
    const roundedBankroll = Math.round(bankroll * 100) / 100;
    const updates: Record<string, number | boolean> = { bankroll: roundedBankroll };
    if (roundedBankroll > settings.peak_bankroll) {
      updates.peak_bankroll = roundedBankroll;
    }
    await updateSettings(updates);

    return NextResponse.json({
      status: 'ok',
      resolved: results.filter(r => r.status === 'won' || r.status === 'lost' || r.status.startsWith('exited_early')).length,
      results,
    });
  } catch (error) {
    console.error('Resolve error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
