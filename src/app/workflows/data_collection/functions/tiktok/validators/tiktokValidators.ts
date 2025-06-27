import { TikTokApiVideoNode, TikTokApiUserNode } from '../../../types/tiktokTypes';

/**
 * Validates a TikTok API Video Node.
 * This is a basic validator. Adjust based on the actual API response structure.
 * @param videoNode The video node data from the TikTok API.
 * @returns True if the video node is valid, false otherwise.
 */
export function isValidTikTokApiVideoNode(videoNode: any): videoNode is TikTokApiVideoNode {
  if (!videoNode || typeof videoNode !== 'object') {
    console.warn('Validation failed: videoNode is not an object or is null.');
    return false;
  }

  // Required fields based on the example TikTokApiVideoNode type
  const requiredFields: (keyof TikTokApiVideoNode)[] = ['id', 'create_time', 'video', 'author', 'stats'];
  for (const field of requiredFields) {
    if (!(field in videoNode) || videoNode[field] === null || videoNode[field] === undefined) {
      console.warn(`Validation failed: videoNode missing or has null/undefined required field: ${String(field)}`);
      return false;
    }
  }

  if (typeof videoNode.id !== 'string') {
    console.warn('Validation failed: videoNode.id is not a string.');
    return false;
  }
  if (typeof videoNode.create_time !== 'number') { // Assuming Unix timestamp
    console.warn('Validation failed: videoNode.create_time is not a number.');
    return false;
  }
  if (typeof videoNode.video !== 'object' || videoNode.video === null) {
    console.warn('Validation failed: videoNode.video is not a valid object.');
    return false;
  }
  if (typeof videoNode.author !== 'object' || videoNode.author === null || typeof videoNode.author.id !== 'string' || typeof videoNode.author.unique_id !== 'string') {
    console.warn('Validation failed: videoNode.author or its required sub-fields are invalid.');
    return false;
  }
  if (typeof videoNode.stats !== 'object' || videoNode.stats === null) {
    console.warn('Validation failed: videoNode.stats is not a valid object.');
    return false;
  }

  // Example checks for nested properties (adjust as per actual API structure)
  if (videoNode.stats.digg_count !== undefined && typeof videoNode.stats.digg_count !== 'number') {
    console.warn('Validation failed: videoNode.stats.digg_count is not a number.');
    return false;
  }
  if (videoNode.stats.play_count !== undefined && typeof videoNode.stats.play_count !== 'number') {
    console.warn('Validation failed: videoNode.stats.play_count is not a number.');
    return false;
  }

  return true;
}

/**
 * Validates a TikTok API User Node.
 * This is a basic validator. Adjust based on the actual API response structure.
 * @param userNode The user node data from the TikTok API.
 * @returns True if the user node is valid, false otherwise.
 */
export function isValidTikTokApiUserNode(userNode: any): userNode is TikTokApiUserNode {
  if (!userNode || typeof userNode !== 'object') {
    console.warn('Validation failed: userNode is not an object or is null.');
    return false;
  }

  // Required fields based on the example TikTokApiUserNode type
  // The actual structure might be userNode.user and userNode.stats
  if (!userNode.user || typeof userNode.user !== 'object' || !userNode.stats || typeof userNode.stats !== 'object') {
    console.warn('Validation failed: userNode is missing user or stats object.');
    return false;
  }

  const requiredUserFields: (keyof TikTokApiUserNode['user'])[] = ['id', 'unique_id', 'verified'];
  for (const field of requiredUserFields) {
    if (!(field in userNode.user) || userNode.user[field] === null || userNode.user[field] === undefined) {
      console.warn(`Validation failed: userNode.user missing or has null/undefined required field: ${String(field)}`);
      return false;
    }
  }

  if (typeof userNode.user.id !== 'string') {
    console.warn('Validation failed: userNode.user.id is not a string.');
    return false;
  }
  if (typeof userNode.user.unique_id !== 'string') {
    console.warn('Validation failed: userNode.user.unique_id is not a string.');
    return false;
  }
  if (typeof userNode.user.verified !== 'boolean') {
    console.warn('Validation failed: userNode.user.verified is not a boolean.');
    return false;
  }

  // Example checks for nested stats properties
  if (userNode.stats.follower_count !== undefined && typeof userNode.stats.follower_count !== 'number') {
    console.warn('Validation failed: userNode.stats.follower_count is not a number.');
    return false;
  }
  if (userNode.stats.video_count !== undefined && typeof userNode.stats.video_count !== 'number') {
    console.warn('Validation failed: userNode.stats.video_count is not a number.');
    return false;
  }

  return true;
}
