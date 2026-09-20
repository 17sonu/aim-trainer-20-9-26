import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import StartScreen from "./components/StartScreen";
import Countdown from "./components/Countdown";
import GameScreen from "./components/GameScreen";
import ResultScreen from "./components/ResultScreen";

import { createAudioManager } from "./utils/audio";

const MODES = {
  "30": {
    id: "30",
    label: "30 SECONDS",
    duration: 30,
    type: "time"
  },

  "60": {
    id: "60",
    label: "60 SECONDS",
    duration: 60,
    type: "time"
  },

  "100": {
    id: "100",
    label: "100 TARGETS",
    targetCount: 100,
    type: "targets"
  }
};

const EMPTY_STATS = {
  score: 0,
  hits: 0,
  misses: 0,
  totalReaction: 0,
  bestReaction: null,
  accuracy: 100,
  averageReaction: 0,
  targetsPerSecond: 0,
  remaining: 0,
  elapsed: 0
};

const STORAGE_KEY = "aim-trainer-personal-bests";
const API_BASE = import.meta.env.VITE_API_URL || "";

/* =========================================================
   LOCAL STORAGE
========================================================= */

function readBests() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );

    return {
      bestScore:
        Number.isFinite(saved.bestScore)
          ? saved.bestScore
          : 0,

      bestAccuracy:
        Number.isFinite(saved.bestAccuracy)
          ? saved.bestAccuracy
          : 0,

      bestReaction:
        Number.isFinite(saved.bestReaction)
          ? saved.bestReaction
          : null,

      bestTargetsPerSecond:
        Number.isFinite(saved.bestTargetsPerSecond)
          ? saved.bestTargetsPerSecond
          : 0
    };
  } catch {
    return {
      bestScore: 0,
      bestAccuracy: 0,
      bestReaction: null,
      bestTargetsPerSecond: 0
    };
  }
}

function saveBests(results) {
  const current = readBests();

  const next = {
    bestScore: Math.max(
      current.bestScore,
      results.score
    ),

    bestAccuracy: Math.max(
      current.bestAccuracy,
      results.accuracy
    ),

    bestReaction:
      current.bestReaction === null
        ? results.bestReaction
        : results.bestReaction === null
          ? current.bestReaction
          : Math.min(
              current.bestReaction,
              results.bestReaction
            ),

    bestTargetsPerSecond: Math.max(
      current.bestTargetsPerSecond,
      results.targetsPerSecond
    )
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(next)
  );

  return next;
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  /* -------------------------------------------------------
     GAME STATE
  ------------------------------------------------------- */

  const [gameState, setGameState] = useState("menu");

  const [selectedMode, setSelectedMode] =
    useState("30");

  const [playerName, setPlayerName] =
    useState(() => localStorage.getItem("aim-trainer-player-name") || "");

  const [leaderboard, setLeaderboard] = useState([]);

  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const [countdown, setCountdown] =
    useState(3);

  const [stats, setStats] =
    useState(EMPTY_STATS);

  const [target, setTarget] =
    useState(null);

  const [feedback, setFeedback] =
    useState(null);

  const [results, setResults] =
    useState(null);

  const [personalBests, setPersonalBests] =
    useState(readBests);

  const [muted, setMuted] =
    useState(false);

  /* -------------------------------------------------------
     REFS
  ------------------------------------------------------- */

  const gameAreaRef = useRef(null);

  const statsRef = useRef(
    EMPTY_STATS
  );

  const targetRef = useRef(null);

  const targetIdRef = useRef(0);

  const gameStartRef = useRef(0);

  const targetAppearRef = useRef(0);

  const countdownTimerRef = useRef(null);

  const timerFrameRef = useRef(null);

  const feedbackTimerRef = useRef(null);

  const startDelayTimerRef = useRef(null);

  const finishRef = useRef(false);

  const pausedAtRef = useRef(null);

  const audioRef = useRef(null);

  const formatLeaderboardDate = useCallback((value) => {
    try {
      return new Date(value).toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "—";
    }
  }, []);

  const loadLeaderboard = useCallback(async (modeId) => {
    setLeaderboardLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/leaderboard/${modeId}`);

      if (!response.ok) {
        throw new Error("Unable to load leaderboard");
      }

      const data = await response.json();

      setLeaderboard(
        (data.entries || []).map((entry) => ({
          ...entry,
          playedAtLabel: formatLeaderboardDate(entry.playedAt)
        }))
      );
    } catch {
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [formatLeaderboardDate]);

  /* -------------------------------------------------------
     CURRENT MODE
  ------------------------------------------------------- */

  const mode = useMemo(
    () => MODES[selectedMode],
    [selectedMode]
  );

  useEffect(() => {
    loadLeaderboard(selectedMode);
  }, [selectedMode, loadLeaderboard]);

  useEffect(() => {
    localStorage.setItem("aim-trainer-player-name", playerName.trim());
  }, [playerName]);

  /* =========================================================
     AUDIO
  ========================================================= */

  useEffect(() => {
    audioRef.current =
      createAudioManager();

    return () => {
      audioRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
  }, [muted]);

  /* =========================================================
     FEEDBACK
  ========================================================= */

  const showFeedback = useCallback(
    (type, text) => {
      window.clearTimeout(
        feedbackTimerRef.current
      );

      setFeedback({
        id: Date.now(),
        type,
        text
      });

      feedbackTimerRef.current =
        window.setTimeout(() => {
          setFeedback(null);
        }, 360);
    },
    []
  );

  /* =========================================================
     SPAWN TARGET
  ========================================================= */

  const spawnTarget = useCallback(() => {
    const area = gameAreaRef.current;

    if (!area || finishRef.current) {
      return;
    }

    const rect =
      area.getBoundingClientRect();

    const minSize =
      window.innerWidth < 600
        ? 48
        : 42;

    const maxSize =
      window.innerWidth < 600
        ? 82
        : 72;

    let progress = 0;

    if (mode.type === "targets") {
      progress = Math.min(
        statsRef.current.hits / 100,
        1
      );
    } else {
      progress = Math.min(
        statsRef.current.elapsed /
          Math.max(mode.duration, 1),
        1
      );
    }

    const size = Math.round(
      maxSize -
        (maxSize - minSize) *
          progress *
          0.55
    );

    const padding = 8;

    const maxX = Math.max(
      padding,
      rect.width -
        size -
        padding
    );

    const maxY = Math.max(
      padding,
      rect.height -
        size -
        padding
    );

    const x =
      padding +
      Math.random() *
        Math.max(
          0,
          maxX - padding
        );

    const y =
      padding +
      Math.random() *
        Math.max(
          0,
          maxY - padding
        );

    const nextTarget = {
      id: ++targetIdRef.current,
      x,
      y,
      size,
      appearedAt: Date.now()
    };

    targetRef.current =
      nextTarget;

    targetAppearRef.current =
      nextTarget.appearedAt;

    setTarget(nextTarget);
  }, [mode]);

  /* =========================================================
     FINISH GAME
  ========================================================= */

  const finishGame = useCallback(() => {
    if (finishRef.current) {
      return;
    }

    finishRef.current = true;

    window.cancelAnimationFrame(
      timerFrameRef.current
    );

    window.clearInterval(
      countdownTimerRef.current
    );

    window.clearTimeout(
      feedbackTimerRef.current
    );

    window.clearTimeout(
      startDelayTimerRef.current
    );

    const current =
      statsRef.current;

    const finalResults = {
      name: playerName.trim(),
      mode: mode.id,
      modeLabel: mode.label,

      score: current.score,

      hits: current.hits,

      misses: current.misses,

      accuracy: current.accuracy,

      averageReaction:
        current.averageReaction,

      bestReaction:
        current.bestReaction,

      targetsPerSecond:
        current.targetsPerSecond
    };

    setTarget(null);

    targetRef.current = null;

    setResults(finalResults);

    const newBests =
      saveBests(finalResults);

    setPersonalBests(newBests);

    setGameState("finished");

    audioRef.current?.play(
      "complete"
    );

    /* -------------------------------------------------------
       SEND RESULT TO BACKEND
       Game still works if backend is unavailable.
    ------------------------------------------------------- */

    fetch(`${API_BASE}/api/results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(finalResults)
    })
      .then(() => loadLeaderboard(mode.id))
      .catch(() => {
        // Backend failure does not affect gameplay.
      });
  }, [mode, playerName, loadLeaderboard]);

  /* =========================================================
     GAME TIMER
  ========================================================= */

  const updateTimer = useCallback(() => {
    if (
      finishRef.current ||
      gameState !== "playing"
    ) {
      return;
    }

    /*
      Date.now() is used instead of simply
      decrementing a counter every second.
    */

    const now = Date.now();

    const elapsedMs = Math.max(
      0,
      now - gameStartRef.current
    );

    const elapsed =
      elapsedMs / 1000;

    /* -------------------------------------------------------
       TIME-BASED MODES
    ------------------------------------------------------- */

    if (mode.type === "time") {
      const remaining = Math.max(
        0,
        mode.duration - elapsed
      );

      const current =
        statsRef.current;

      const next = {
        ...current,

        elapsed,

        remaining,

        averageReaction:
          current.hits > 0
            ? current.totalReaction /
              current.hits
            : 0,

        targetsPerSecond:
          elapsed > 0
            ? current.hits / elapsed
            : 0
      };

      statsRef.current = next;

      setStats(next);

      /* -----------------------------------------------------
         TIME OVER
      ----------------------------------------------------- */

      if (remaining <= 0) {
        finishGame();
        return;
      }
    }

    /* -------------------------------------------------------
       TARGET-BASED MODE
    ------------------------------------------------------- */

    else {
      const current =
        statsRef.current;

      const next = {
        ...current,

        elapsed,

        remaining: 0,

        averageReaction:
          current.hits > 0
            ? current.totalReaction /
              current.hits
            : 0,

        targetsPerSecond:
          elapsed > 0
            ? current.hits / elapsed
            : 0
      };

      statsRef.current = next;

      setStats(next);

      if (
        current.hits >=
        mode.targetCount
      ) {
        finishGame();
        return;
      }
    }

    timerFrameRef.current =
      window.requestAnimationFrame(
        updateTimer
      );
  }, [
    finishGame,
    gameState,
    mode
  ]);

  /* =========================================================
     BEGIN PLAYING
  ========================================================= */

  const beginPlaying =
    useCallback(() => {
      finishRef.current = false;

      const initialStats = {
        ...EMPTY_STATS,

        remaining:
          mode.type === "time"
            ? mode.duration
            : 0
      };

      statsRef.current =
        initialStats;

      setStats(initialStats);

      setTarget(null);

      targetRef.current = null;

      const now = Date.now();

      gameStartRef.current =
        now;

      pausedAtRef.current = null;

      setGameState("playing");

      /*
        Wait until React has rendered the game area.
      */

      window.requestAnimationFrame(
        () => {
          if (!finishRef.current) {
            spawnTarget();
          }
        }
      );
    }, [
      mode,
      spawnTarget
    ]);

  /* =========================================================
     START COUNTDOWN
  ========================================================= */

  const startCountdown =
    useCallback(() => {
      if (
        gameState !== "menu" &&
        gameState !== "finished"
      ) {
        return;
      }

      const cleanName = playerName.trim();

      if (!cleanName) {
        window.alert("Please enter your name before starting the game.");
        return;
      }

      if (cleanName.length > 30) {
        window.alert("Name must be 30 characters or fewer.");
        return;
      }

      setPlayerName(cleanName);

      /*
        IMPORTANT:
        cancelAnimationFrame is the correct
        browser API.

        Do NOT use:
        window.clearAnimationFrame()
      */

      window.clearInterval(
        countdownTimerRef.current
      );

      window.cancelAnimationFrame(
        timerFrameRef.current
      );

      window.clearTimeout(
        startDelayTimerRef.current
      );

      setResults(null);

      setFeedback(null);

      setCountdown(3);

      setGameState("countdown");

      let count = 3;

      audioRef.current?.play(
        "countdown"
      );

      countdownTimerRef.current =
        window.setInterval(() => {
          count -= 1;

          if (count > 0) {
            setCountdown(count);

            audioRef.current?.play(
              "countdown"
            );
          } else {
            window.clearInterval(
              countdownTimerRef.current
            );

            setCountdown("GO!");

            audioRef.current?.play(
              "countdown"
            );

            startDelayTimerRef.current =
              window.setTimeout(() => {
                beginPlaying();
              }, 500);
          }
        }, 1000);
    }, [
      beginPlaying,
      gameState,
      playerName
    ]);

  /* =========================================================
     START GAME TIMER WHEN PLAYING
  ========================================================= */

  useEffect(() => {
    if (gameState === "playing") {
      timerFrameRef.current =
        window.requestAnimationFrame(
          updateTimer
        );
    }

    return () => {
      window.cancelAnimationFrame(
        timerFrameRef.current
      );
    };
  }, [
    gameState,
    updateTimer
  ]);

  /* =========================================================
     TAB VISIBILITY
  ========================================================= */

  useEffect(() => {
    const handleVisibility =
      () => {
        /*
          If the user changes tabs,
          pause the timer.
        */

        if (
          document.hidden &&
          gameState === "playing"
        ) {
          pausedAtRef.current =
            Date.now();

          return;
        }

        /*
          When returning to the tab,
          compensate for inactive time.
        */

        if (
          !document.hidden &&
          gameState === "playing" &&
          pausedAtRef.current
        ) {
          const pausedFor =
            Date.now() -
            pausedAtRef.current;

          gameStartRef.current +=
            pausedFor;

          if (
            targetAppearRef.current
          ) {
            targetAppearRef.current +=
              pausedFor;

            if (targetRef.current) {
              targetRef.current = {
                ...targetRef.current,

                appearedAt:
                  targetRef.current
                    .appearedAt +
                  pausedFor
              };

              setTarget({
                ...targetRef.current
              });
            }
          }

          pausedAtRef.current =
            null;
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [gameState]);

  /* =========================================================
     WINDOW RESIZE
  ========================================================= */

  useEffect(() => {
    const handleResize =
      () => {
        const current =
          targetRef.current;

        const area =
          gameAreaRef.current;

        if (
          !current ||
          !area ||
          finishRef.current
        ) {
          return;
        }

        const rect =
          area.getBoundingClientRect();

        const padding = 8;

        const x = Math.min(
          Math.max(
            current.x,
            padding
          ),

          Math.max(
            padding,
            rect.width -
              current.size -
              padding
          )
        );

        const y = Math.min(
          Math.max(
            current.y,
            padding
          ),

          Math.max(
            padding,
            rect.height -
              current.size -
              padding
          )
        );

        if (
          x !== current.x ||
          y !== current.y
        ) {
          const next = {
            ...current,
            x,
            y
          };

          targetRef.current =
            next;

          setTarget(next);
        }
      };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  /* =========================================================
     GLOBAL CLEANUP
  ========================================================= */

  useEffect(() => {
    return () => {
      window.clearInterval(
        countdownTimerRef.current
      );

      window.cancelAnimationFrame(
        timerFrameRef.current
      );

      window.clearTimeout(
        feedbackTimerRef.current
      );

      window.clearTimeout(
        startDelayTimerRef.current
      );
    };
  }, []);

  /* =========================================================
     TARGET HIT
  ========================================================= */

  const handleTargetHit =
    useCallback(
      (targetId) => {
        /*
          Ignore clicks when game isn't active.
        */

        if (
          gameState !== "playing" ||
          finishRef.current
        ) {
          return;
        }

        const currentTarget =
          targetRef.current;

        /*
          Protect against:
          - stale clicks
          - double clicks
          - clicking an old target
        */

        if (
          !currentTarget ||
          currentTarget.id !== targetId
        ) {
          return;
        }

        /* ---------------------------------------------------
           REACTION TIME
        --------------------------------------------------- */

        const reaction =
          Math.max(
            0,
            Date.now() -
              targetAppearRef.current
          );

        const current =
          statsRef.current;

        const hits =
          current.hits + 1;

        /* ---------------------------------------------------
           SCORE
        --------------------------------------------------- */

        const scoreGain =
          Math.max(
            25,
            150 -
              Math.floor(
                reaction / 10
              )
          );

        const score =
          current.score +
          scoreGain;

        /* ---------------------------------------------------
           ACCURACY
        --------------------------------------------------- */

        const totalAttempts =
          hits +
          current.misses;

        const accuracy =
          totalAttempts > 0
            ? (hits /
                totalAttempts) *
              100
            : 100;

        /* ---------------------------------------------------
           ELAPSED TIME
        --------------------------------------------------- */

        const elapsed =
          Math.max(
            0.001,
            (Date.now() -
              gameStartRef.current) /
              1000
          );

        /* ---------------------------------------------------
           NEXT STATS
        --------------------------------------------------- */

        const next = {
          ...current,

          score,

          hits,

          totalReaction:
            current.totalReaction +
            reaction,

          bestReaction:
            current.bestReaction === null
              ? reaction
              : Math.min(
                  current.bestReaction,
                  reaction
                ),

          accuracy,

          averageReaction:
            (current.totalReaction +
              reaction) /
            hits,

          targetsPerSecond:
            hits / elapsed,

          elapsed,

          remaining:
            mode.type === "time"
              ? Math.max(
                  0,
                  mode.duration -
                    elapsed
                )
              : 0
        };

        statsRef.current =
          next;

        setStats(next);

        /*
          Remove the current target
          immediately.
        */

        targetRef.current = null;

        setTarget(null);

        audioRef.current?.play("shot");

        showFeedback(
          "hit",
          `+${scoreGain}`
        );

        audioRef.current?.play("hit");

        /* ---------------------------------------------------
           100 TARGET MODE COMPLETE
        --------------------------------------------------- */

        if (
          mode.type === "targets" &&
          hits >= mode.targetCount
        ) {
          finishGame();
          return;
        }

        /* ---------------------------------------------------
           SPAWN NEXT TARGET
        --------------------------------------------------- */

        window.requestAnimationFrame(
          () => {
            if (
              gameState ===
                "playing" &&
              !finishRef.current
            ) {
              spawnTarget();
            }
          }
        );
      },
      [
        finishGame,
        gameState,
        mode,
        showFeedback,
        spawnTarget
      ]
    );

  /* =========================================================
     MISS
  ========================================================= */

  const handleMiss =
    useCallback(
      (event) => {
        if (
          gameState !== "playing" ||
          finishRef.current
        ) {
          return;
        }

        /*
          If the click originated
          from the target, don't count
          it as a miss.
        */

        if (
          event.target.closest(
            "[data-target='true']"
          )
        ) {
          return;
        }

        const current =
          statsRef.current;

        const misses =
          current.misses + 1;

        const totalAttempts =
          current.hits + misses;

        const accuracy =
          totalAttempts > 0
            ? (current.hits /
                totalAttempts) *
              100
            : 0;

        const next = {
          ...current,
          misses,
          accuracy
        };

        statsRef.current =
          next;

        setStats(next);

        /*
          A miss consumes the current target.
          Remove it first so the player cannot
          keep interacting with the missed target,
          then spawn a fresh target.
        */

        targetRef.current = null;
        setTarget(null);

        audioRef.current?.play("shot");

        showFeedback(
          "miss",
          "MISS"
        );

        audioRef.current?.play("miss");

        window.requestAnimationFrame(
          () => {
            if (
              gameState === "playing" &&
              !finishRef.current
            ) {
              spawnTarget();
            }
          }
        );
      },
      [
        gameState,
        showFeedback,
        spawnTarget
      ]
    );

  /* =========================================================
     RETURN TO MENU
  ========================================================= */

  const resetToMenu =
    useCallback(() => {
      window.clearInterval(
        countdownTimerRef.current
      );

      window.cancelAnimationFrame(
        timerFrameRef.current
      );

      window.clearTimeout(
        feedbackTimerRef.current
      );

      window.clearTimeout(
        startDelayTimerRef.current
      );

      finishRef.current = true;

      setTarget(null);

      targetRef.current = null;

      setFeedback(null);

      setResults(null);

      setStats(
        EMPTY_STATS
      );

      statsRef.current =
        EMPTY_STATS;

      setCountdown(3);

      setGameState("menu");
    }, []);

  /* =========================================================
     PLAY AGAIN
  ========================================================= */

  const playAgain =
    useCallback(() => {
      startCountdown();
    }, [startCountdown]);

  /* =========================================================
     START SCREEN
  ========================================================= */

  if (gameState === "menu") {
    return (
      <StartScreen
        mode={selectedMode}
        modes={MODES}
        onModeChange={
          setSelectedMode
        }
        onStart={
          startCountdown
        }
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        personalBests={
          personalBests
        }
        leaderboard={leaderboard}
        leaderboardLoading={leaderboardLoading}
        muted={muted}
        onToggleMute={() =>
          setMuted(
            (value) => !value
          )
        }
      />
    );
  }

  /* =========================================================
     COUNTDOWN SCREEN
  ========================================================= */

  if (
    gameState === "countdown"
  ) {
    return (
      <Countdown
        value={countdown}
        muted={muted}
        onToggleMute={() =>
          setMuted(
            (value) => !value
          )
        }
      />
    );
  }

  /* =========================================================
     GAME SCREEN
  ========================================================= */

  if (
    gameState === "playing"
  ) {
    return (
      <GameScreen
        gameAreaRef={
          gameAreaRef
        }
        stats={stats}
        mode={mode}
        target={target}
        feedback={feedback}
        muted={muted}
        onToggleMute={() =>
          setMuted(
            (value) => !value
          )
        }
        onTargetHit={
          handleTargetHit
        }
        onMiss={
          handleMiss
        }
      />
    );
  }

  /* =========================================================
     RESULT SCREEN
  ========================================================= */

  return (
    <ResultScreen
      results={results}
      personalBests={
        personalBests
      }
      leaderboard={leaderboard}
      leaderboardLoading={leaderboardLoading}
      onPlayAgain={
        playAgain
      }
      onChangeMode={
        resetToMenu
      }
      onHome={
        resetToMenu
      }
      muted={muted}
      onToggleMute={() =>
        setMuted(
          (value) => !value
        )
      }
    />
  );
}