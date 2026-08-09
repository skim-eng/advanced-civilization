import type { PGlite } from '@electric-sql/pglite';
import { ConflictError, type BugReportRow, type ChatMessage, type GameMeta, type ReportFilter, type SnapshotRow, type SnapshotStore } from 'digital-boardgame-framework/server';

const json = (value: unknown) => JSON.stringify(value ?? null);

export class PgliteSnapshotStore implements SnapshotStore {
  constructor(readonly db: PGlite) {}

  async putGameMeta(meta: GameMeta): Promise<void> {
    await this.db.query(`
      insert into dbf_games (game_id, players, tokens, emails, created_at, resolved, reminder, identities, ranked_report)
      values ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)
      on conflict (game_id) do update set
        players = excluded.players, tokens = excluded.tokens, emails = excluded.emails,
        created_at = excluded.created_at, resolved = excluded.resolved, reminder = excluded.reminder,
        identities = excluded.identities, ranked_report = excluded.ranked_report
    `, [meta.gameId, json(meta.players), json(meta.tokens), json(meta.emails ?? {}), meta.createdAt, meta.resolved ?? false, json(meta.reminder), json(meta.identities ?? {}), json(meta.rankedReport)]);
  }

  private meta(row: Record<string, unknown>): GameMeta {
    return {
      gameId: row.game_id as string,
      players: row.players as string[],
      tokens: row.tokens as Record<string, string>,
      emails: row.emails as Record<string, string>,
      createdAt: String(row.created_at),
      resolved: row.resolved as boolean,
      reminder: (row.reminder ?? undefined) as GameMeta['reminder'],
      identities: (row.identities ?? undefined) as GameMeta['identities'],
      rankedReport: (row.ranked_report ?? undefined) as GameMeta['rankedReport'],
    };
  }

  async getGameMeta(gameId: string): Promise<GameMeta | null> {
    const result = await this.db.query<Record<string, unknown>>('select * from dbf_games where game_id = $1', [gameId]);
    return result.rows[0] ? this.meta(result.rows[0]) : null;
  }

  async listActiveGames(): Promise<GameMeta[]> {
    const result = await this.db.query<Record<string, unknown>>('select * from dbf_games where resolved = false order by created_at', []);
    return result.rows.map((row) => this.meta(row));
  }

  async postMessage(gameId: string, message: ChatMessage): Promise<void> {
    await this.db.query('insert into dbf_messages (game_id, seat, body, created_at) values ($1, $2, $3, $4)', [gameId, message.seat, message.body, message.at]);
  }

  async listMessages(gameId: string, limit = 100): Promise<ChatMessage[]> {
    const result = await this.db.query<{ seat: string; body: string; created_at: string }>('select seat, body, created_at from dbf_messages where game_id = $1 order by created_at desc limit $2', [gameId, limit]);
    return result.rows.reverse().map((row) => ({ seat: row.seat, body: row.body, at: String(row.created_at) }));
  }

  async deleteGame(gameId: string): Promise<void> {
    await this.db.query('delete from dbf_games where game_id = $1', [gameId]);
  }

  async putSnapshot(gameId: string, row: SnapshotRow): Promise<void> {
    try { await this.db.query('insert into dbf_snapshots (game_id, turn, state) values ($1, $2, $3)', [gameId, row.turn, row.state]); }
    catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictError(`Snapshot ${gameId}@${row.turn} already exists`);
      throw error;
    }
  }

  async getLatest(gameId: string): Promise<SnapshotRow | null> {
    const result = await this.db.query<SnapshotRow>('select turn, state from dbf_snapshots where game_id = $1 order by turn desc limit 1', [gameId]);
    return result.rows[0] ?? null;
  }

  async getHistory(gameId: string): Promise<SnapshotRow[]> {
    return (await this.db.query<SnapshotRow>('select turn, state from dbf_snapshots where game_id = $1 order by turn', [gameId])).rows;
  }

  async pruneSnapshots(gameId: string, minTurn: number): Promise<void> {
    await this.db.query('delete from dbf_snapshots where game_id = $1 and turn < $2', [gameId, minTurn]);
  }

  async putReport(row: BugReportRow): Promise<void> {
    await this.db.query(`
      insert into dbf_reports (report_id, game_id, reporter_side, turn_number, server_snapshot, reporter_view, client_log, message, severity, category, app_id, client_build, user_agent, created_at, resolution)
      values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15::jsonb)
    `, [row.reportId, row.gameId, row.reporterSide, row.turnNumber, row.serverSnapshot, row.reporterView, json(row.clientLog), row.message, row.severity, row.category ?? null, row.appId ?? null, row.clientBuild ?? null, row.userAgent ?? null, row.createdAt, json(row.resolution)]);
  }

  async listReports(filter?: ReportFilter): Promise<BugReportRow[]> {
    const result = await this.db.query<Record<string, unknown>>('select * from dbf_reports order by created_at desc');
    return result.rows
      .map((row) => ({
        reportId: row.report_id as string,
        gameId: row.game_id as string | null,
        reporterSide: row.reporter_side as string | null,
        turnNumber: row.turn_number as number,
        serverSnapshot: row.server_snapshot as string,
        reporterView: row.reporter_view as string,
        clientLog: row.client_log as BugReportRow['clientLog'],
        message: row.message as string,
        severity: row.severity as string,
        category: (row.category ?? undefined) as string | undefined,
        appId: (row.app_id ?? undefined) as string | undefined,
        clientBuild: (row.client_build ?? undefined) as string | undefined,
        userAgent: (row.user_agent ?? undefined) as string | undefined,
        createdAt: String(row.created_at),
        resolution: (row.resolution ?? undefined) as BugReportRow['resolution'],
      }))
      .filter((row) => !filter?.since || row.createdAt >= filter.since)
      .filter((row) => !filter?.severity || row.severity === filter.severity)
      .filter((row) => !filter?.category || row.category === filter.category)
      .filter((row) => !filter?.appId || row.appId === filter.appId)
      .filter((row) => !filter?.unresolved || !row.resolution)
      .filter((row) => !filter?.gameId || row.gameId === filter.gameId);
  }

  async resolveReport(reportId: string, resolution: string): Promise<void> {
    await this.db.query('update dbf_reports set resolution = $2::jsonb where report_id = $1', [reportId, json({ at: new Date().toISOString(), note: resolution })]);
  }
}
