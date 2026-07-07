import prisma from "../lib/prisma.js";

// Create playlist
export const createPlaylist = async (req, res) => {
  try {
    const { title, description, coverImageUrl } = req.body;

    if (!title || !description || !coverImageUrl) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and coverImageUrl are required",
      });
    }

    const playlist = await prisma.playlist.create({
      data: {
        title,
        description,
        coverImageUrl,
      },
    });
    
    res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      data: playlist,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get active playlist with audios
export const getActivePlaylist = async (req, res) => {
  try {
    const playlist = await prisma.playlist.findFirst({
      where: { isActive: true },
      include: {
        audios: {
          where: { isActive: true },
          orderBy: { audioOrder: "asc" },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add audio to playlist
export const addAudioToPlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;

    if (!playlistId) {
      return res.status(400).json({
        success: false,
        message: "Playlist ID is required",
      });
    }

    const {
      title,
      description,
      audioUrl,
      thumbnailUrl,
      durationSeconds,
      audioOrder,
    } = req.body;

    if (!title || !description || !audioUrl || !thumbnailUrl || !durationSeconds || !audioOrder) {
      return res.status(400).json({
        success: false,
        message: "All audio details are required",
      });
    }

    const audio = await prisma.playlistAudio.create({
      data: {
        playlistId,
        title,
        description,
        audioUrl,
        thumbnailUrl,
        durationSeconds,
        audioOrder,
      },
    });

    await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        totalAudios: {
          increment: 1,
        }, 
        estimatedDurationMinutes: {
      increment: Math.ceil(durationSeconds / 60),
    },
      },
    });

    res.status(201).json({
      success: true,
      message: "Audio added successfully",
      data: audio,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user progress
export const updateAudioProgress = async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      playlistId,
      audioId,
      playedDurationSeconds,
      completionPercentage,
    } = req.body;

    if (!sessionId || !userId || !playlistId || !audioId || playedDurationSeconds === undefined || completionPercentage === undefined) {
      return res.status(400).json({
        success: false,
        message: "All progress details are required",
      });
    }

    const isCompleted = completionPercentage >= 90;

    const progress = await prisma.userPlaylistProgress.upsert({
      where: {
        sessionId_audioId: {
          sessionId,
          audioId,
        },
      },
      update: {
        userId,
        playedDurationSeconds,
        completionPercentage,
        isStarted: true,
        isCompleted,
        lastPlayedAt: new Date(),
        completedAt: isCompleted ? new Date() : null,
      },
      create: {
        sessionId,
        userId,
        playlistId,
        audioId,
        playedDurationSeconds,
        completionPercentage,
        isStarted: true,
        isCompleted,
        startedAt: new Date(),
        lastPlayedAt: new Date(),
        completedAt: isCompleted ? new Date() : null,
      },
    });

    res.status(200).json({
      success: true,
      message: "Progress updated successfully",
      data: progress,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const deleteAudio = async (req, res) => {
  try {
    const { audioId } = req.params;

    const audio = await prisma.playlistAudio.findUnique({
      where: { id: audioId },
    });

    if (!audio) {
      return res.status(404).json({
        success: false,
        message: "Audio not found",
      });
    }

    await prisma.playlistAudio.delete({
      where: { id: audioId },
    });

    await prisma.playlist.update({
      where: { id: audio.playlistId },
      data: {
        totalAudios: {
          decrement: 1,
        },
        estimatedDurationMinutes: {
          decrement: Math.ceil((audio.durationSeconds || 0) / 60),
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Audio deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all playlists without full audio details
export const getAllPlaylists = async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverImageUrl: true,
        totalAudios: true,
        estimatedDurationMinutes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      count: playlists.length,
      data: playlists,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get playlist details by ID with audios
export const getPlaylistById = async (req, res) => {
  try {
    const { playlistId } = req.params;

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        audios: {
          orderBy: {
            audioOrder: "asc",
          },
        },
      },
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};