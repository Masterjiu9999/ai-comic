import { ScriptShot, ShotAssets, ShotStatus } from '../types';

/**
 * AssetManager Implementation
 * Handles path resolution and status verification for production assets.
 */

// Mimics standard naming convention
export const getAssetPath = (episodeNum: number, shotId: string, assetType: keyof ShotAssets): string => {
  const epPrefix = `EP${episodeNum.toString().padStart(2, '0')}`;
  
  // In a real file system, this would be an absolute path.
  // In this web demo, we might store Base64 or Blob URLs, but we define the *virtual* path key here.
  switch (assetType) {
    case 'start_frame':
      return `${epPrefix}/Images/${shotId}_Start.png`;
    case 'end_frame':
      return `${epPrefix}/Images/${shotId}_End.png`;
    case 'video':
      return `${epPrefix}/Video/${shotId}_Clip.mp4`;
    case 'audio':
      return `${epPrefix}/Audio/${shotId}_Dialogue.wav`;
    default:
      return '';
  }
};

// Verifies the existence of assets.
// In a real desktop app, this checks os.path.exists().
// In this web version, it checks if the value in the JSON object is non-empty/valid.
export const verifyShotAssets = (shot: ScriptShot): ShotStatus => {
  return {
    has_start: !!shot.assets?.start_frame && shot.assets.start_frame.length > 0,
    has_end: !!shot.assets?.end_frame && shot.assets.end_frame.length > 0,
    has_video: !!shot.assets?.video && shot.assets.video.length > 0,
    has_audio: !!shot.assets?.audio && shot.assets.audio.length > 0,
  };
};

// Batch verify a list of scenes
export const verifyEpisodeAssets = (scenes: any[]): any[] => {
    return scenes.map(scene => ({
        ...scene,
        shots: scene.shots.map((shot: ScriptShot) => {
            // Ensure structure exists
            const safeShot = {
                ...shot,
                assets: shot.assets || {},
                status: shot.status || { has_start: false, has_end: false, has_video: false, has_audio: false }
            };
            // Update status based on assets
            safeShot.status = verifyShotAssets(safeShot);
            return safeShot;
        })
    }));
};