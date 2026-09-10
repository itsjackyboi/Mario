/* prerelease.js — the PRE-RELEASE RECORDS, frozen.
 *
 * The board as it stood at the end of the pre-release game: the record of who
 * did what first, on levels that v2 has since changed. Nothing outside this
 * file feeds it — the sheet can be wiped, redeployed or pointed somewhere else
 * and the archive screen will not move.
 *
 * WHAT IS IN HERE. The top five per level and for the whole-game speedrun,
 * taken from the `Pre Release Records` tab of the sheet on 2026-09-10 —
 * that is, the records themselves rather than every run ever posted. Each row
 * carries only what the board actually shows — time, player, mode, grog,
 * deaths, build, date. The shard count is not among them and is not invented
 * here.
 *
 * If you would rather freeze the complete history, do it BEFORE the sheet is
 * wiped: open the game with the old board still reachable, run
 *
 *   copy(PL.Archive.dump())
 *
 * in the console and paste the result over this whole file. That writes every
 * row the board holds, in the same shape, and this note goes with it.
 *
 * DATA ONLY. src/archive.js has the behaviour and is never regenerated.
 */

window.PL = window.PL || {};
window.PL.PreRelease = {
  frozen: true,
  capturedAt: '2026-09-10',
  note: 'Top five per level from the pre-release board, plus its TAS rows.',
  rows: [
    { level: 'full-game', town: '_speedrun', player: 'Buke', timeMs: 540400, time: '09:00.40', grog: 440, deaths: 1, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'full-game', town: '_speedrun', player: 'Buke', timeMs: 567150, time: '09:27.15', grog: 440, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'full-game', town: '_speedrun', player: 'Buke', timeMs: 585467, time: '09:45.46', grog: 444, deaths: 1, speedrun: true, tas: false, version: '1.17.0', date: '2026-09-08' },
    { level: 'full-game', town: '_speedrun', player: 'Buke', timeMs: 634617, time: '10:34.61', grog: 469, deaths: 8, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'full-game', town: '_speedrun', player: 'Buke', timeMs: 653300, time: '10:53.29', grog: 439, deaths: 6, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },

    { level: 'shantytown-1', town: 'shantytown', player: 'Buke', timeMs: 25933, time: '00:25.93', grog: 12, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'shantytown-1', town: 'shantytown', player: 'Jack_Anqoak', timeMs: 25933, time: '00:25.93', grog: 9, deaths: 0, speedrun: false, tas: false, version: '1.17.0', date: '2026-09-09' },
    { level: 'shantytown-1', town: 'shantytown', player: 'Jack_Anqoak', timeMs: 25933, time: '00:25.93', grog: 10, deaths: 0, speedrun: false, tas: false, version: '1.17.0', date: '2026-09-09' },
    { level: 'shantytown-1', town: 'shantytown', player: 'Jack_Anqoak', timeMs: 25933, time: '00:25.93', grog: 10, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-09' },
    { level: 'shantytown-1', town: 'shantytown', player: 'Jack_Anqoak', timeMs: 25933, time: '00:25.93', grog: 9, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-09' },

    { level: 'shantytown-2', town: 'shantytown', player: 'Buke', timeMs: 28017, time: '00:28.01', grog: 23, deaths: 0, speedrun: false, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'shantytown-2', town: 'shantytown', player: 'Buke', timeMs: 28017, time: '00:28.01', grog: 22, deaths: 0, speedrun: false, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'shantytown-2', town: 'shantytown', player: 'Buke', timeMs: 28033, time: '00:28.03', grog: 23, deaths: 0, speedrun: false, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'shantytown-2', town: 'shantytown', player: 'Buke', timeMs: 28033, time: '00:28.03', grog: 23, deaths: 0, speedrun: false, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'shantytown-2', town: 'shantytown', player: 'Buke', timeMs: 28033, time: '00:28.03', grog: 22, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },

    { level: 'shantytown-3', town: 'shantytown', player: 'Buke', timeMs: 63383, time: '01:03.38', grog: 37, deaths: 0, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'shantytown-3', town: 'shantytown', player: 'Buke', timeMs: 63783, time: '01:03.78', grog: 35, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'shantytown-3', town: 'shantytown', player: 'Buke', timeMs: 63800, time: '01:03.79', grog: 39, deaths: 0, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'shantytown-3', town: 'shantytown', player: 'Buke', timeMs: 63800, time: '01:03.79', grog: 40, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'shantytown-3', town: 'shantytown', player: 'Buke', timeMs: 63850, time: '01:03.84', grog: 37, deaths: 0, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },

    { level: 'aleforge-1', town: 'aleforge', player: 'Buke', timeMs: 22750, time: '00:22.75', grog: 12, deaths: 0, speedrun: true, tas: false, version: '1.17.0', date: '2026-09-08' },
    { level: 'aleforge-1', town: 'aleforge', player: 'Buke', timeMs: 22783, time: '00:22.78', grog: 13, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'aleforge-1', town: 'aleforge', player: 'Buke', timeMs: 22800, time: '00:22.80', grog: 12, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'aleforge-1', town: 'aleforge', player: 'Buke', timeMs: 22817, time: '00:22.81', grog: 15, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'aleforge-1', town: 'aleforge', player: 'Buke', timeMs: 22817, time: '00:22.81', grog: 14, deaths: 0, speedrun: true, tas: false, version: '1.13.0', date: '2026-09-05' },

    { level: 'aleforge-2', town: 'aleforge', player: 'Jack_Anqoak', timeMs: 20250, time: '00:20.25', grog: 9, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-09' },
    { level: 'aleforge-2', town: 'aleforge', player: 'Jack_Anqoak', timeMs: 20250, time: '00:20.25', grog: 10, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-09' },
    { level: 'aleforge-2', town: 'aleforge', player: 'Jack_Anqoak', timeMs: 20267, time: '00:20.26', grog: 7, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-09' },
    { level: 'aleforge-2', town: 'aleforge', player: 'Jack_Anqoak', timeMs: 20267, time: '00:20.26', grog: 11, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-09' },
    { level: 'aleforge-2', town: 'aleforge', player: 'Jack_Anqoak', timeMs: 20267, time: '00:20.26', grog: 9, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-09' },

    { level: 'aleforge-3', town: 'aleforge', player: 'Buke', timeMs: 39333, time: '00:39.33', grog: 44, deaths: 0, speedrun: false, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'aleforge-3', town: 'aleforge', player: 'Buke', timeMs: 40017, time: '00:40.01', grog: 46, deaths: 0, speedrun: true, tas: false, version: '1.9.3', date: '2026-09-04' },
    { level: 'aleforge-3', town: 'aleforge', player: 'Buke', timeMs: 40100, time: '00:40.09', grog: 44, deaths: 0, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'aleforge-3', town: 'aleforge', player: 'Buke', timeMs: 40250, time: '00:40.24', grog: 41, deaths: 0, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'aleforge-3', town: 'aleforge', player: 'Buke', timeMs: 40367, time: '00:40.36', grog: 43, deaths: 0, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },

    { level: 'providence-1', town: 'providence', player: 'Jack_Anqoak', timeMs: 28400, time: '00:28.40', grog: 18, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-10' },
    { level: 'providence-1', town: 'providence', player: 'Buke', timeMs: 28433, time: '00:28.43', grog: 17, deaths: 0, speedrun: false, tas: false, version: '1.9.2', date: '2026-09-04' },
    { level: 'providence-1', town: 'providence', player: 'Buke', timeMs: 28467, time: '00:28.46', grog: 15, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'providence-1', town: 'providence', player: 'Jack_Anqoak', timeMs: 28467, time: '00:28.46', grog: 18, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-10' },
    { level: 'providence-1', town: 'providence', player: 'Buke', timeMs: 28500, time: '00:28.50', grog: 18, deaths: 0, speedrun: true, tas: false, version: '1.9.3', date: '2026-09-04' },

    { level: 'providence-2', town: 'providence', player: 'Buke', timeMs: 25533, time: '00:25.53', grog: 14, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'providence-2', town: 'providence', player: 'Jack_Anqoak', timeMs: 25533, time: '00:25.53', grog: 14, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-10' },
    { level: 'providence-2', town: 'providence', player: 'Jack_Anqoak', timeMs: 25683, time: '00:25.68', grog: 13, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-10' },
    { level: 'providence-2', town: 'providence', player: 'Jack_Anqoak', timeMs: 25967, time: '00:25.96', grog: 14, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-10' },
    { level: 'providence-2', town: 'providence', player: 'Jack_Anqoak', timeMs: 26017, time: '00:26.01', grog: 13, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-10' },

    { level: 'providence-3', town: 'providence', player: 'Buke', timeMs: 35967, time: '00:35.96', grog: 59, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'providence-3', town: 'providence', player: 'Jack_Anqoak', timeMs: 36033, time: '00:36.03', grog: 62, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'providence-3', town: 'providence', player: 'Jack_Anqoak', timeMs: 36133, time: '00:36.13', grog: 54, deaths: 0, speedrun: false, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'providence-3', town: 'providence', player: 'Buke', timeMs: 36433, time: '00:36.43', grog: 64, deaths: 0, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'providence-3', town: 'providence', player: 'Buke', timeMs: 36500, time: '00:36.50', grog: 59, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },

    { level: 'providence-oweblock', town: 'providence', player: 'Jack_Anqoak', timeMs: 35683, time: '00:35.68', grog: 22, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-10' },
    { level: 'providence-oweblock', town: 'providence', player: 'Buke', timeMs: 35800, time: '00:35.80', grog: 24, deaths: 0, speedrun: false, tas: false, version: '1.9.2', date: '2026-09-04' },
    { level: 'providence-oweblock', town: 'providence', player: 'Buke', timeMs: 35850, time: '00:35.85', grog: 24, deaths: 0, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'providence-oweblock', town: 'providence', player: 'Buke', timeMs: 35850, time: '00:35.85', grog: 27, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'providence-oweblock', town: 'providence', player: 'Buke', timeMs: 35850, time: '00:35.85', grog: 27, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },

    { level: 'fenwick-1', town: 'fenwick', player: 'Jack_Anqoak', timeMs: 24533, time: '00:24.53', grog: 11, deaths: 0, speedrun: false, tas: false, version: '1.18.0', date: '2026-09-10' },
    { level: 'fenwick-1', town: 'fenwick', player: 'Buke', timeMs: 24567, time: '00:24.56', grog: 15, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'fenwick-1', town: 'fenwick', player: 'Buke', timeMs: 24567, time: '00:24.56', grog: 16, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'fenwick-1', town: 'fenwick', player: 'Buke', timeMs: 24583, time: '00:24.58', grog: 11, deaths: 0, speedrun: true, tas: false, version: '1.17.0', date: '2026-09-08' },
    { level: 'fenwick-1', town: 'fenwick', player: 'Buke', timeMs: 24600, time: '00:24.60', grog: 14, deaths: 0, speedrun: true, tas: false, version: '1.13.0', date: '2026-09-06' },

    { level: 'fenwick-2', town: 'fenwick', player: 'Buke', timeMs: 32083, time: '00:32.08', grog: 50, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'fenwick-2', town: 'fenwick', player: 'Buke', timeMs: 32167, time: '00:32.16', grog: 46, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'fenwick-2', town: 'fenwick', player: 'Buke', timeMs: 32500, time: '00:32.50', grog: 46, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'fenwick-2', town: 'fenwick', player: 'Buke', timeMs: 32733, time: '00:32.73', grog: 35, deaths: 0, speedrun: false, tas: false, version: '1.9.2', date: '2026-09-04' },
    { level: 'fenwick-2', town: 'fenwick', player: 'Jack_Anqoak', timeMs: 32800, time: '00:32.80', grog: 42, deaths: 0, speedrun: false, tas: false, version: '1.8', date: '2026-09-04' },

    { level: 'roto-1', town: 'roto', player: 'Buke', timeMs: 26150, time: '00:26.15', grog: 23, deaths: 0, speedrun: true, tas: false, version: '1.17.0', date: '2026-09-08' },
    { level: 'roto-1', town: 'roto', player: 'Buke', timeMs: 26200, time: '00:26.20', grog: 22, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'roto-1', town: 'roto', player: 'Buke', timeMs: 26233, time: '00:26.23', grog: 23, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'roto-1', town: 'roto', player: 'Buke', timeMs: 26233, time: '00:26.23', grog: 22, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'roto-1', town: 'roto', player: 'Buke', timeMs: 26300, time: '00:26.30', grog: 24, deaths: 0, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },

    { level: 'roto-2', town: 'roto', player: 'Buke', timeMs: 28267, time: '00:28.26', grog: 20, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'roto-2', town: 'roto', player: 'Buke', timeMs: 28333, time: '00:28.33', grog: 20, deaths: 0, speedrun: true, tas: false, version: '1.17.0', date: '2026-09-08' },
    { level: 'roto-2', town: 'roto', player: 'Buke', timeMs: 28367, time: '00:28.36', grog: 20, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'roto-2', town: 'roto', player: 'Buke', timeMs: 36217, time: '00:36.21', grog: 20, deaths: 0, speedrun: true, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'roto-2', town: 'roto', player: 'Buke', timeMs: 37683, time: '00:37.68', grog: 20, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },

    { level: 'roto-3', town: 'roto', player: 'Buke', timeMs: 31183, time: '00:31.18', grog: 35, deaths: 0, speedrun: false, tas: false, version: '1.9.2', date: '2026-09-04' },
    { level: 'roto-3', town: 'roto', player: 'Buke', timeMs: 31183, time: '00:31.18', grog: 41, deaths: 0, speedrun: false, tas: false, version: '1.9.2', date: '2026-09-04' },
    { level: 'roto-3', town: 'roto', player: 'Buke', timeMs: 31200, time: '00:31.20', grog: 44, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'roto-3', town: 'roto', player: 'Buke', timeMs: 31467, time: '00:31.46', grog: 36, deaths: 0, speedrun: false, tas: false, version: '1.9.2', date: '2026-09-04' },
    { level: 'roto-3', town: 'roto', player: 'Buke', timeMs: 31550, time: '00:31.55', grog: 34, deaths: 0, speedrun: false, tas: false, version: '1.9.2', date: '2026-09-04' },

    { level: 'tavern-1', town: 'tavern', player: 'Buke', timeMs: 35367, time: '00:35.36', grog: 29, deaths: 0, speedrun: false, tas: false, version: '1.8', date: '2026-09-04' },
    { level: 'tavern-1', town: 'tavern', player: 'Buke', timeMs: 35567, time: '00:35.56', grog: 29, deaths: 0, speedrun: false, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'tavern-1', town: 'tavern', player: 'Buke', timeMs: 35717, time: '00:35.71', grog: 30, deaths: 0, speedrun: true, tas: false, version: '1.17.0', date: '2026-09-08' },
    { level: 'tavern-1', town: 'tavern', player: 'Buke', timeMs: 35733, time: '00:35.73', grog: 32, deaths: 0, speedrun: true, tas: false, version: '1.10.0', date: '2026-09-04' },
    { level: 'tavern-1', town: 'tavern', player: 'Buke', timeMs: 35767, time: '00:35.76', grog: 32, deaths: 0, speedrun: false, tas: false, version: '1.8', date: '2026-09-04' },

    /* Tool-assisted. The board keeps these apart from played times. */
    { level: 'shantytown-1', town: 'shantytown', player: 'Jack_Anqoak', timeMs: 25917, time: '00:25.91', grog: 12, deaths: 0, speedrun: false, tas: true, version: '1.18.0', date: '2026-09-09' },
    { level: 'providence-2', town: 'providence', player: 'Jack_Anqoak', timeMs: 25500, time: '00:25.50', grog: 13, deaths: 0, speedrun: false, tas: true, version: '1.18.0', date: '2026-09-10' }
  ]
};
