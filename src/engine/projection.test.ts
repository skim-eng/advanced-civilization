import { describe, expect, it } from 'vitest';
import { adapter, createGame } from './index.js';
import type { GameState, PlayerId } from './index.js';

const players: PlayerId[] = ['egypt', 'babylon', 'assyria', 'asia'];
const [egypt, babylon, assyria] = players as [PlayerId, PlayerId, PlayerId, PlayerId];

function privateState(): GameState {
  const state = createGame({ players, seed: 901, maxTurns: 60, boardPreset: 'raw-4p-east' });
  for (const id of players) {
    state.players[id]!.hand = { [`hand-secret-${id}`]: players.indexOf(id) + 1 };
    state.players[id]!.calamities = [`legacy-calamity-secret-${id}`];
  }
  state.trade.stacks = {
    1: ['deck-secret-a', 'deck-secret-b'],
    9: ['deck-secret-nine'],
  };
  state.rngState = 987_654_321;
  state.pendingCalamities = [
    { calamityId: 'queued-secret-egypt', holder: egypt },
    { calamityId: 'queued-secret-babylon', holder: babylon },
  ];
  state.calamityTradedFrom = { 'provenance-secret': assyria };
  state.negotiation.offers = [{
    id: 1,
    from: egypt,
    give: { actual: { 'offer-secret-egypt': 3 }, declared: { salt: 3 } },
    wants: ['iron'],
    responses: [{
      from: babylon,
      give: { actual: { 'response-secret-babylon': 3 }, declared: { iron: 3 } },
    }],
  }];
  state.negotiation.completed = [
    {
      a: egypt,
      b: babylon,
      aGave: { actual: { 'completed-secret-egypt': 3 }, declared: { salt: 3 } },
      bGave: { actual: { 'completed-secret-babylon': 3 }, declared: { iron: 3 } },
    },
  ];

  const before = { 'resume-secret': { city: egypt, tokens: { [egypt]: 4 } } };
  state.pendingAllocation = {
    calamityId: 'famine', holder: egypt, kind: 'unitPoints', pool: 10,
    caps: { [babylon]: 8 }, cityWorth: 5, areas: ['allocation-secret'],
    before, overviewBefore: 'allocation-overview-secret',
  };
  state.pendingCityChoice = {
    calamityId: 'superstition', holder: egypt, count: 1,
    before, overviewBefore: 'city-overview-secret',
  };
  state.pendingUnitLoss = {
    calamityId: 'flood', holder: egypt, points: 5, cityWorth: 5, mode: 'remove',
    areas: ['unit-loss-secret'], before, overviewBefore: 'unit-overview-secret',
  };
  state.pendingDiscard = { holder: egypt, count: 1 };
  state.pendingSupport = {
    holder: egypt, candidates: ['support-candidate-secret'], lock: 1, mode: 'slaverevolt',
    before, overviewBefore: 'support-overview-secret',
  };
  state.pendingPick = {
    chooser: babylon, stage: 'barbarian', victim: egypt, count: 1,
    candidates: ['pick-candidate-secret'], march: { here: 'march-secret', visited: ['visited-secret'] },
    before, overviewBefore: 'pick-overview-secret',
  };
  state.pendingCivilWar = {
    victim: egypt, beneficiary: babylon, stage: 'beneficiarySelect',
    victimPoints: 15, beneficiaryPoints: 20, philosophy: false, military: false,
    faction1: { tokens: { 'faction-token-secret': 3 }, cities: ['faction-city-secret'] },
    faction2: { tokens: { 'faction-two-secret': 2 }, cities: [] },
    before, overviewBefore: 'civil-war-overview-secret',
  };
  state.pendingSecondary = {
    calamityId: 'famine', primary: egypt,
    queue: [{ victim: babylon, kind: 'unitPoints', amount: 8, cityWorth: 5, areas: ['secondary-area-secret'] }],
    before, overviewBefore: 'secondary-overview-secret',
  };
  state.expansion = {
    remaining: { [egypt]: 3, [babylon]: 4 },
    caps: { [egypt]: { 'expansion-secret-egypt': 3 }, [babylon]: { 'expansion-secret-babylon': 4 } },
  };
  state.pendingRevolts = { [egypt]: 1, [babylon]: 2 };
  return state;
}

describe('server-side hidden-state projection', () => {
  it('preserves the canonical state while replacing server-only deck and RNG data', () => {
    const state = privateState();
    const canonical = structuredClone(state);
    const view = adapter.viewFor(state, egypt);

    expect(state).toEqual(canonical);
    expect(view.trade.stacks[1]).toEqual(['[hidden]', '[hidden]']);
    expect(view.trade.stacks[9]).toEqual(['[hidden]']);
    expect(view.rngState).toBe(0);
    expect(view.calamityTradedFrom).toEqual({});
    expect(JSON.stringify(view)).not.toContain('deck-secret');
    expect(JSON.stringify(view)).not.toContain('provenance-secret');
  });

  it('shows a seat only its own hand, queued calamity, offer contents, and response contents', () => {
    const state = privateState();
    const egyptView = adapter.viewFor(state, egypt);
    const babylonView = adapter.viewFor(state, babylon);

    expect(egyptView.players[egypt]!.hand).toEqual({ 'hand-secret-egypt': 1 });
    expect(egyptView.players[babylon]!.hand).toEqual({});
    expect(egyptView.players[babylon]!.handCount).toBe(2);
    expect(egyptView.pendingCalamities).toEqual([
      { calamityId: 'queued-secret-egypt', holder: egypt },
      { calamityId: '[hidden]', holder: babylon },
    ]);
    expect(egyptView.negotiation.offers[0]!.give.actual).toEqual({ 'offer-secret-egypt': 3 });
    expect(egyptView.negotiation.offers[0]!.responses[0]!.give.actual).toEqual({});

    expect(babylonView.players[egypt]!.hand).toEqual({});
    expect(babylonView.players[babylon]!.hand).toEqual({ 'hand-secret-babylon': 2 });
    expect(babylonView.pendingCalamities).toEqual([
      { calamityId: '[hidden]', holder: egypt },
      { calamityId: 'queued-secret-babylon', holder: babylon },
    ]);
    expect(babylonView.negotiation.offers[0]!.give.actual).toEqual({});
    expect(babylonView.negotiation.offers[0]!.responses[0]!.give.actual).toEqual({ 'response-secret-babylon': 3 });
  });

  it('limits completed trades to participants and pending-choice details to the chooser', () => {
    const state = privateState();
    const egyptView = adapter.viewFor(state, egypt);
    const babylonView = adapter.viewFor(state, babylon);
    const observerView = adapter.viewFor(state, assyria);

    expect(egyptView.negotiation.completed).toHaveLength(1);
    expect(babylonView.negotiation.completed).toHaveLength(1);
    expect(observerView.negotiation.completed).toEqual([]);
    expect(JSON.stringify(observerView)).not.toContain('completed-secret');

    expect(egyptView.pendingAllocation?.caps).toEqual({ [babylon]: 8 });
    expect(egyptView.pendingAllocation?.areas).toEqual(['allocation-secret']);
    expect(babylonView.pendingAllocation?.caps).toEqual({});
    expect(babylonView.pendingAllocation?.areas).toEqual([]);
    expect(egyptView.pendingSupport?.candidates).toEqual(['support-candidate-secret']);
    expect(babylonView.pendingSupport?.candidates).toEqual([]);
    expect(egyptView.pendingPick?.candidates).toEqual([]);
    expect(egyptView.pendingPick?.march).toBeUndefined();
    expect(babylonView.pendingPick?.candidates).toEqual(['pick-candidate-secret']);
    expect(babylonView.pendingCivilWar?.faction1.tokens).toEqual({ 'faction-token-secret': 3 });
    expect(egyptView.pendingCivilWar?.faction1).toEqual({ tokens: {}, cities: [] });

    for (const view of [egyptView, babylonView, observerView]) {
      const encoded = JSON.stringify(view);
      expect(encoded).not.toContain('resume-secret');
      expect(encoded).not.toContain('overview-secret');
      expect(view.pendingSecondary?.queue[0]).toEqual({
        victim: babylon, kind: 'unitPoints', amount: 0, cityWorth: 0, areas: [],
      });
    }
  });

  it('scopes pending expansion and revolt maps to the receiving seat', () => {
    const state = privateState();
    const egyptView = adapter.viewFor(state, egypt);
    const babylonView = adapter.viewFor(state, babylon);
    const observerView = adapter.viewFor(state, assyria);

    expect(egyptView.expansion).toEqual({
      remaining: { [egypt]: 3 }, caps: { [egypt]: { 'expansion-secret-egypt': 3 } },
    });
    expect(babylonView.expansion).toEqual({
      remaining: { [babylon]: 4 }, caps: { [babylon]: { 'expansion-secret-babylon': 4 } },
    });
    expect(observerView.expansion).toEqual({ remaining: {}, caps: {} });
    expect(egyptView.pendingRevolts).toEqual({ [egypt]: 1 });
    expect(babylonView.pendingRevolts).toEqual({ [babylon]: 2 });
    expect(observerView.pendingRevolts).toEqual({});
  });
});
