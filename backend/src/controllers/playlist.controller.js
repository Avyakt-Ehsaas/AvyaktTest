import prisma from "../lib/prisma.js";
import fs from "fs/promises";
import path from "path";

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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required",
      });
    }

    const {
      title,
      description,
      thumbnailUrl,
      durationSeconds,
      audioOrder,
    } = req.body;

    if (
      !title ||
      durationSeconds === undefined ||
      audioOrder === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, durationSeconds and audioOrder are required",
      });
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    const parsedDuration = Number(durationSeconds);
    const parsedOrder = Number(audioOrder);

    if (
      Number.isNaN(parsedDuration) ||
      parsedDuration <= 0 ||
      Number.isNaN(parsedOrder) ||
      parsedOrder <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "durationSeconds and audioOrder must be valid numbers",
      });
    }

    const audioUrl = `/uploads/audios/${req.file.filename}`;

    const audio = await prisma.$transaction(async (tx) => {
      const createdAudio = await tx.playlistAudio.create({
        data: {
          playlistId,
          title,
          description: description || null,
          audioUrl,
          thumbnailUrl: thumbnailUrl || null,
          durationSeconds: parsedDuration,
          audioOrder: parsedOrder,
        },
      });

      await tx.playlist.update({
        where: { id: playlistId },
        data: {
          totalAudios: {
            increment: 1,
          },
          estimatedDurationMinutes: {
            increment: Math.ceil(parsedDuration / 60),
          },
        },
      });

      return createdAudio;
    });

    return res.status(201).json({
      success: true,
      message: "Audio uploaded and added successfully",
      data: audio,
    });
  } catch (error) {
    console.error("Add audio error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
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

    await prisma.$transaction(async (tx) => {
      await tx.playlistAudio.delete({
        where: { id: audioId },
      });

      await tx.playlist.update({
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
    });

    if (audio.audioUrl?.startsWith("/uploads/")) {
      const relativePath = audio.audioUrl.replace(/^\/+/, "");
      const filePath = path.join(process.cwd(), relativePath);

      try {
        await fs.unlink(filePath);
      } catch (fileError) {
        if (fileError.code !== "ENOENT") {
          console.error("Audio file delete error:", fileError);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Audio deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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

export const deletePlaylist = async(req,res) => {
  try{
    const {playlistId} = req.params;

    const playlist = await prisma.playlist.findUnique({
      where: {id: playlistId}
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    await prisma.playlist.delete({
      where: {id: playlistId}
    });

    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully",
    });

  }catch(error){
    res.status(500).json({ success: false, message: error.message });
  }
}