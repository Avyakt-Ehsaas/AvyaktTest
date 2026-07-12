import YouTube from "react-youtube";

type LockedPlayerModalProps = {
  title: string;
  audioUrl: string;
  audioCompleted: boolean;
  holdProgress: number;
  onAudioEnd: () => void;
  onComplete: () => void;
  onHoldStart: () => void;
  onHoldCancel: () => void;
};

export function LockedPlayerModal({
  title,
  audioUrl,
  audioCompleted,
  holdProgress,
  onAudioEnd,
  onComplete,
  onHoldStart,
  onHoldCancel,
}: LockedPlayerModalProps) {
  const remainingHoldTime = Math.max(0, 5 - holdProgress);

  function getYouTubeVideoId(url: string) {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname.includes("youtu.be")) {
        return parsedUrl.pathname.replace("/", "");
      }

      if (parsedUrl.pathname.includes("/embed/")) {
        return parsedUrl.pathname.split("/embed/")[1];
      }

      return parsedUrl.searchParams.get("v") || "";
    } catch {
      return "";
    }
  }

  const youtubeVideoId = getYouTubeVideoId(audioUrl);
  const isYouTube = Boolean(youtubeVideoId);

  return (
    <div className="locked-player-overlay">
      <div className="locked-player-card">
        <p className="audio-label">Now Playing</p>

        <h1 className="locked-player-title">{title}</h1>

        <div className="locked-audio-visual">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        {isYouTube ? (
          <div className="youtube-player-wrapper">
            <YouTube
              videoId={youtubeVideoId}
              opts={{
                width: "100%",
                height: "390",
                playerVars: {
                  autoplay: 1,
                  controls: 1,
                  rel: 0,
                },
              }}
              onEnd={onAudioEnd}
              className="youtube-player"
              iframeClassName="youtube-player-frame"
            />
          </div>
        ) : (
          <audio
            src={audioUrl}
            controls
            autoPlay
            className="audio-player"
            onEnded={onAudioEnd}
          />
        )}

        {audioCompleted ? (
          <button
            type="button"
            className="btn locked-exit-btn"
            onClick={onComplete}
          >
            Complete Session
          </button>
        ) : (
          <button
            type="button"
            className="hold-exit-btn"
            onMouseDown={onHoldStart}
            onMouseUp={onHoldCancel}
            onMouseLeave={onHoldCancel}
            onTouchStart={onHoldStart}
            onTouchEnd={onHoldCancel}
            onTouchCancel={onHoldCancel}
          >
            Hold for {remainingHoldTime} seconds to exit
            <span>{holdProgress}/5 sec</span>
          </button>
        )}
      </div>
    </div>
  );
}