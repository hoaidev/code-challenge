export function buildCreateGameDto(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Game',
    description: 'A test game description',
    price: 29.99,
    status: 'PUBLISHED',
    type: 'SINGLE_PLAYER',
    genre: 'ACTION',
    ...overrides,
  };
}

export function buildCreateGamePlayerDto(
  gameSlug: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    gameSlug,
    playerEmail: 'player@test.com',
    playerName: 'Test Player',
    score: 100,
    ...overrides,
  };
}
