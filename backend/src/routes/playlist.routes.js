import express from "express";

import {
  createPlaylist,
  getActivePlaylist,
  addAudioToPlaylist,
  updateAudioProgress,
  deleteAudio,
  getAllPlaylists,
  getPlaylistById
} from "../controllers/playlist.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/playlists:
 *   post:
 *     summary: Create a new playlist
 *     tags: [Playlists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Corporate Meditation Playlist
 *               description:
 *                 type: string
 *                 example: 7 audio meditation journey
 *               coverImageUrl:
 *                 type: string
 *                 example: https://example.com/cover.jpg
 *     responses:
 *       201:
 *         description: Playlist created successfully
 */
router.post("/", createPlaylist);

/**
 * @swagger
 * /api/playlists/active:
 *   get:
 *     summary: Get active playlist with audios
 *     tags: [Playlists]
 *     responses:
 *       200:
 *         description: Active playlist fetched successfully
 */
router.get("/active", getActivePlaylist);


/**
 * @swagger
 * /api/playlists/{playlistId}/audios:
 *   post:
 *     summary: Add audio to playlist
 *     tags: [Playlist Audios]
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - audioUrl
 *               - audioOrder
 *             properties:
 *               title:
 *                 type: string
 *                 example: Breathing Meditation
 *               description:
 *                 type: string
 *                 example: Calm breathing audio
 *               audioUrl:
 *                 type: string
 *                 example: https://example.com/audio1.mp3
 *               thumbnailUrl:
 *                 type: string
 *                 example: https://example.com/thumb.jpg
 *               durationSeconds:
 *                 type: integer
 *                 example: 300
 *               audioOrder:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Audio added successfully
 */
router.post("/:playlistId/audios", addAudioToPlaylist);



/**
 * @swagger
 * /api/playlists/progress:
 *   patch:
 *     summary: Update user audio progress
 *     tags: [User Progress]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - playlistId
 *               - audioId
 *               - playedDurationSeconds
 *               - completionPercentage
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: qr-user-123
 *               userId:
 *                 type: string
 *                 example: user-uuid
 *               playlistId:
 *                 type: string
 *                 example: playlist-uuid
 *               audioId:
 *                 type: string
 *                 example: audio-uuid
 *               playedDurationSeconds:
 *                 type: integer
 *                 example: 120
 *               completionPercentage:
 *                 type: integer
 *                 example: 40
 *     responses:
 *       200:
 *         description: Progress updated successfully
 */
router.patch("/progress", updateAudioProgress);

/**
 * @swagger
 * /api/playlists/audios/{audioId}:
 *   delete:
 *     summary: Delete an audio from playlist
 *     tags: [Playlist Audios]
 *     parameters:
 *       - in: path
 *         name: audioId
 *         required: true
 *         schema:
 *           type: string
 *         description: Audio ID
 *     responses:
 *       200:
 *         description: Audio deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Audio deleted successfully
 *       404:
 *         description: Audio not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Audio not found
 */
router.delete("/audios/:audioId", deleteAudio);

/**
 * @swagger
 * /api/playlists:
 *   get:
 *     summary: Get all playlists
 *     description: Fetch all playlists without full audio details.
 *     tags: [Playlists]
 *     responses:
 *       200:
 *         description: Playlists fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 33260f55-79e7-4a63-842d-813c0363cded
 *                       title:
 *                         type: string
 *                         example: Corporate Mindfulness Playlist
 *                       description:
 *                         type: string
 *                         example: Meditation playlist for corporate wellness session
 *                       coverImageUrl:
 *                         type: string
 *                         example: https://template.canva.com/EAGYFQxnznA/2/0/800w-A1Elrsdqe74.jpg
 *                       totalAudios:
 *                         type: integer
 *                         example: 8
 *                       estimatedDurationMinutes:
 *                         type: integer
 *                         example: 49
 *                       isActive:
 *                         type: boolean
 *                         example: true
 */
router.get("/", getAllPlaylists);
/**
 * @swagger
 * /api/playlists/{playlistId}:
 *   get:
 *     summary: Get playlist by ID
 *     description: Fetch playlist details with all audios by playlist ID.
 *     tags: [Playlists]
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *         example: 33260f55-79e7-4a63-842d-813c0363cded
 *     responses:
 *       200:
 *         description: Playlist fetched successfully
 *       404:
 *         description: Playlist not found
 */
router.get("/:playlistId", getPlaylistById);

export default router;